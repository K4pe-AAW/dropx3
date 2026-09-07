import crypto from "node:crypto"
import { QUICK_AFFILIATE_RETAILERS, isSafeExternalUrl } from "./affiliate"
import { brushUpDraftWithUrl } from "./draft-brushup"
import {
  generateId,
  generateSlug,
  mutateArticles,
  mutateDrafts,
  mutateJson,
  putBlobFile,
  readDrafts,
} from "./storage"
import { canonicalBrandNames } from "./brands"
import { MAX_ARTICLE_GALLERY_IMAGES, canonicalImageKey, isSameProductAssetFamily } from "./image-candidates"
import type { AffiliateLink, Article, Draft, GalleryImage } from "./types"
import { inferContentType } from "./content-type"
import { ensureUnconfirmedTitle } from "./information-status"
import { isDraftAllowedByYoutubeCollectionPolicy } from "./youtube-collection-policy"

// 既存の公開数を引き継ぎつつ、2時間枠ごとに3件、4時間（6件）ごとに
// YouTube 1件を目安として再試行する。
const STATE_PATH = "data/daily-auto-publish-state-throughput-v4.json"
const AUTO_PUBLISH_POLICY_VERSION = "throughput-v4"
const YOUTUBE_MIX_POLICY_VERSION = "youtube-mix-v1"
export const ARTICLES_PER_AUTO_PUBLISH_RUN = 3
export const MIN_ARTICLES_PER_TWO_HOUR_SLOT = 3
export const ARTICLES_PER_YOUTUBE_MIX_CYCLE = 6
export const TARGET_YOUTUBE_ARTICLES_PER_MIX_CYCLE = 1

type RunRecord = {
  startedAt: string
  lastAttemptAt?: string
  mixCycle?: string
  publishedArticleIds?: string[]
  publishedYoutubeArticleIds?: string[]
  titles?: string[]
}
type AutoPublishState = { runs: Record<string, RunRecord> }

export function jstSlotKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ""
  const twoHourBucket = Math.floor(Number(get("hour")) / 2) * 2
  return `${get("year")}-${get("month")}-${get("day")}-${String(twoHourBucket).padStart(2, "0")}-${AUTO_PUBLISH_POLICY_VERSION}`
}

export function jstYoutubeMixCycleKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ""
  const fourHourBucket = Math.floor(Number(get("hour")) / 4) * 4
  return `${get("year")}-${get("month")}-${get("day")}-${String(fourHourBucket).padStart(2, "0")}-${YOUTUBE_MIX_POLICY_VERSION}`
}

export function buildRequiredAffiliateLinks(query: string): AffiliateLink[] {
  return QUICK_AFFILIATE_RETAILERS.map((item) => {
    if (!item.build) throw new Error(`${item.retailer}の自動リンク生成が未設定です`)
    return item.build(query)
  })
}

function referenceSourceUrl(draft: Draft): string | null {
  const url = draft.suggestedOfficialLinks?.find((link) => isSafeExternalUrl(link.url))?.url
  if (url) return url
  if (draft.suggestedYoutubeVideoId) {
    return draft.sourceRefs.find((ref) => /(?:youtube\.com|youtu\.be)/i.test(ref.url))?.url ?? null
  }
  // 通常記事は管理画面でカバー画像まで確認済みのものに限り、元記事を再確認用URLとして使う。
  // 画像未確認のRSS下書きをそのまま自動公開する経路にはしない。
  if (!draft.suggestedCoverImage) return null
  return draft.sourceRefs.find((ref) => isSafeExternalUrl(ref.url))?.url ?? null
}

function hasPublishableTheme(draft: Draft): boolean {
  return Boolean(draft.title.trim() && draft.excerpt.trim() && draft.bodyParagraphs.some((p) => p.trim()))
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function orderAutoPublishCandidates(drafts: Draft[], youtubePublishedInCycle: number): Draft[] {
  const allowedDrafts = drafts.filter(isDraftAllowedByYoutubeCollectionPolicy)
  const youtubeQuotaRemaining = Math.max(
    0,
    TARGET_YOUTUBE_ARTICLES_PER_MIX_CYCLE - youtubePublishedInCycle
  )
  const normalCandidates = shuffled(allowedDrafts.filter((draft) => !draft.suggestedYoutubeVideoId))
  const youtubeCandidates = shuffled(allowedDrafts.filter((draft) => Boolean(draft.suggestedYoutubeVideoId)))
  return youtubeQuotaRemaining > 0
    ? [...youtubeCandidates, ...normalCandidates]
    : normalCandidates
}

async function saveArticleImage(imageUrl: string, draft: Draft, name: string): Promise<string> {
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DropDropDropImageCollector/1.0; +https://dropx3.com)" },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`公式画像を保存できませんでした(HTTP ${res.status})`)
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? ""
  if (!contentType.startsWith("image/")) throw new Error("公式画像の応答が画像ではありません")
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) throw new Error("公式画像の容量が不正です")
  const ext = ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  } as Record<string, string>)[contentType] ?? "img"
  return putBlobFile(`article-images/${draft.id}/${name}.${ext}`, buffer, contentType)
}

export function uniqueGalleryCandidates(
  coverImageUrl: string,
  gallery: { url: string; alt: string; credit?: string }[],
  limit = MAX_ARTICLE_GALLERY_IMAGES
): { url: string; alt: string; credit?: string }[] {
  const seen = new Set([canonicalImageKey(coverImageUrl)])
  const result: { url: string; alt: string; credit?: string }[] = []
  for (const image of gallery) {
    const key = canonicalImageKey(image.url)
    if (!image.url || seen.has(key) || !isSameProductAssetFamily(coverImageUrl, image.url)) continue
    seen.add(key)
    result.push(image)
    if (result.length >= limit) break
  }
  return result
}

/**
 * 公開直前のブラッシュアップで再取得した画像は、確認済み公式リンクを取得元にした場合だけ候補へ加える。
 * 第三者記事から見つかった画像を「同一商品らしい」という理由だけで自動転載しない。
 */
export function galleryCandidatesForPublish(
  draft: Draft,
  sourceUrl: string,
  refreshedImageUrls: string[]
): GalleryImage[] {
  const existing = draft.suggestedGalleryImages ?? []
  const sourceIsConfirmedOfficial = draft.suggestedOfficialLinks?.some((link) => link.url === sourceUrl) ?? false
  if (!sourceIsConfirmedOfficial) return existing
  return [
    ...existing,
    ...refreshedImageUrls.map((url) => ({ url, alt: draft.title })),
  ]
}

export { isSameProductAssetFamily } from "./image-candidates"

async function saveGalleryImages(
  draft: Draft,
  coverImageUrl: string,
  galleryCandidates: GalleryImage[]
): Promise<GalleryImage[]> {
  const candidates = uniqueGalleryCandidates(coverImageUrl, galleryCandidates)
  const saved: GalleryImage[] = []
  for (const [index, image] of candidates.entries()) {
    try {
      saved.push({
        url: await saveArticleImage(image.url, draft, `gallery-${index + 1}`),
        alt: image.alt.trim() || draft.title,
        ...(image.credit ? { credit: image.credit } : {}),
      })
    } catch {
      // 追加画像は任意。取得不能・形式不正なら公開自体を止めず、その画像だけ採用しない。
    }
  }
  return saved
}

async function prepareArticle(draft: Draft): Promise<Article> {
  if (!hasPublishableTheme(draft)) throw new Error("テーマに必要な本文が不足しています")
  const sourceUrl = referenceSourceUrl(draft)
  if (!sourceUrl) throw new Error("確認済み画像または参照リンクがありません")
  const query = draft.suggestedAffiliateSearch[0]?.trim()
  if (!query) throw new Error("アフィリエイト検索語がありません")
  // 設定不足ならOpenAIや公式サイト取得を始める前に止め、無駄なAPI利用を避ける。
  const affiliateLinks = buildRequiredAffiliateLinks(query)

  const brushed = await brushUpDraftWithUrl(
    {
      title: draft.title,
      excerpt: draft.excerpt,
      bodyParagraphs: draft.bodyParagraphs,
      colorways: draft.suggestedColorways ?? [],
      informationStatus: draft.informationStatus,
    },
    sourceUrl
  )
  const sourceCoverImage = draft.suggestedYoutubeVideoId
    ? `https://img.youtube.com/vi/${draft.suggestedYoutubeVideoId}/hqdefault.jpg`
    : draft.suggestedCoverImage
  if (!sourceCoverImage) throw new Error("公式ページから一致画像を取得できません")
  const coverImage = draft.suggestedYoutubeVideoId || sourceCoverImage.startsWith("/")
    ? sourceCoverImage
    : await saveArticleImage(sourceCoverImage, draft, "cover")
  const galleryImages = draft.suggestedYoutubeVideoId
    ? []
    : await saveGalleryImages(
        draft,
        sourceCoverImage,
        galleryCandidatesForPublish(draft, sourceUrl, brushed.imageCandidates)
      )
  const informationStatus = draft.informationStatus ?? "report"
  const title = ensureUnconfirmedTitle(brushed.title, informationStatus)

  // 同じ下書きを再試行しても記事IDを増殖させない。
  const id = generateId(`${draft.id}-${AUTO_PUBLISH_POLICY_VERSION}`)
  const now = new Date().toISOString()
  return {
    id,
    slug: generateSlug(title, id),
    title,
    excerpt: brushed.excerpt,
    bodyParagraphs: brushed.bodyParagraphs,
    coverImage,
    coverImageAlt: title,
    // カバーを必須・最優先にし、同一画像を除いた取得可能な追加画像だけを自己ホストして採用する。
    galleryImages,
    ...(draft.suggestedYoutubeVideoId ? { youtubeVideoId: draft.suggestedYoutubeVideoId } : {}),
    category: draft.category,
    contentType: inferContentType(draft.category, affiliateLinks.length > 0),
    informationStatus,
    brands: canonicalBrandNames(draft.brands),
    tags: draft.tags,
    publishedAt: now,
    featured: false,
    ...(brushed.colorways.length > 0 ? { colorways: brushed.colorways } : {}),
    affiliateLinks,
    officialLinks: draft.suggestedOfficialLinks ?? [],
    sourceRefs: draft.sourceRefs.some((ref) => ref.url === sourceUrl)
      ? draft.sourceRefs
      : [...draft.sourceRefs, brushed.sourceRef],
  }
}

export async function runDailyAutoPublish(now = new Date()): Promise<{
  published: boolean
  publishedCount: number
  slot: string | null
  titles?: string[]
  skipped?: string[]
}> {
  const slot = jstSlotKey(now)
  const mixCycle = jstYoutubeMixCycleKey(now)

  let alreadyPublishedArticleIds: string[] = []
  let alreadyPublishedYoutubeArticleIds: string[] = []
  let alreadyPublishedTitles: string[] = []
  await mutateJson<AutoPublishState>(STATE_PATH, { runs: {} }, (state) => {
    const existing = state.runs[slot]
    alreadyPublishedArticleIds = existing?.publishedArticleIds ?? []
    alreadyPublishedYoutubeArticleIds = [...new Set(
      Object.values(state.runs)
        .filter((run) => run.mixCycle === mixCycle)
        .flatMap((run) => run.publishedYoutubeArticleIds ?? [])
    )]
    alreadyPublishedTitles = existing?.titles ?? []
    state.runs[slot] = {
      startedAt: existing?.startedAt ?? now.toISOString(),
      lastAttemptAt: now.toISOString(),
      mixCycle,
      publishedArticleIds: alreadyPublishedArticleIds,
      publishedYoutubeArticleIds: existing?.publishedYoutubeArticleIds ?? [],
      titles: alreadyPublishedTitles,
    }
    return state
  })
  if (alreadyPublishedArticleIds.length >= MIN_ARTICLES_PER_TWO_HOUR_SLOT) {
    return { published: false, publishedCount: 0, slot, skipped: ["この2時間枠は3件公開済みです"] }
  }

  const { drafts } = await readDrafts()
  const errors: string[] = []
  const publishedArticles: Article[] = []
  const remainingTarget = MIN_ARTICLES_PER_TWO_HOUR_SLOT - alreadyPublishedArticleIds.length
  // 9/4までの運用と同じく、下書きを一律ゲートで除外せず公開処理を試す。
  // 4時間（6件）の中でYouTubeがまだ0件なら先に1件を試し、残りは通常記事にする。
  // YouTubeが公開条件を満たさない場合は通常記事へ進み、公開本数そのものは止めない。
  const youtubeQuotaRemaining = Math.max(
    0,
    TARGET_YOUTUBE_ARTICLES_PER_MIX_CYCLE - alreadyPublishedYoutubeArticleIds.length
  )
  const candidates = orderAutoPublishCandidates(drafts, alreadyPublishedYoutubeArticleIds.length)
  let youtubePublished = 0
  for (const draft of candidates) {
    if (publishedArticles.length >= Math.min(ARTICLES_PER_AUTO_PUBLISH_RUN, remainingTarget)) break
    if (draft.suggestedYoutubeVideoId && youtubePublished >= youtubeQuotaRemaining) continue
    try {
      const article = await prepareArticle(draft)
      await mutateArticles((data) => {
        if (!data.articles.some((existing) => existing.id === article.id)) data.articles.unshift(article)
        data.lastUpdated = article.publishedAt
        return data
      })
      await mutateDrafts((data) => {
        data.drafts = data.drafts.filter((item) => item.id !== draft.id)
        return data
      })
      publishedArticles.push(article)
      if (draft.suggestedYoutubeVideoId) youtubePublished++
    } catch (err) {
      errors.push(`${draft.title}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  await mutateJson<AutoPublishState>(STATE_PATH, { runs: {} }, (state) => {
    const existing = state.runs[slot]
    const publishedArticleIds = [...new Set([
      ...(existing?.publishedArticleIds ?? alreadyPublishedArticleIds),
      ...publishedArticles.map((article) => article.id),
    ])]
    const titles = [...new Set([
      ...(existing?.titles ?? alreadyPublishedTitles),
      ...publishedArticles.map((article) => article.title),
    ])]
    state.runs[slot] = {
      startedAt: existing?.startedAt ?? now.toISOString(),
      lastAttemptAt: now.toISOString(),
      mixCycle,
      publishedArticleIds,
      publishedYoutubeArticleIds: [...new Set([
        ...(existing?.publishedYoutubeArticleIds ?? []),
        ...publishedArticles.filter((article) => Boolean(article.youtubeVideoId)).map((article) => article.id),
      ])],
      titles,
    }
    return state
  })
  const totalPublishedInSlot = alreadyPublishedArticleIds.length + publishedArticles.length
  return {
    published: publishedArticles.length > 0,
    publishedCount: publishedArticles.length,
    slot,
    titles: publishedArticles.map((article) => article.title),
    skipped: errors.length > 0
      ? errors
      : totalPublishedInSlot < MIN_ARTICLES_PER_TWO_HOUR_SLOT
        ? [`この2時間枠は${totalPublishedInSlot}/3件です。次の30分実行で再試行します`]
        : [],
  }
}
