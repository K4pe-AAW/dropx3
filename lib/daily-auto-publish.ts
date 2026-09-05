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
import { canonicalImageKey, isSameProductAssetFamily } from "./image-candidates"
import type { AffiliateLink, Article, Draft, GalleryImage } from "./types"
import { inferContentType } from "./content-type"

// 旧自動公開の実行履歴と分離し、2時間枠ごとの重複実行を独立して管理する。
const STATE_PATH = "data/daily-auto-publish-state-safe-v3.json"
const AUTO_PUBLISH_POLICY_VERSION = "safe-v3"
export const ARTICLES_PER_AUTO_PUBLISH_RUN = 3
export const MAX_YOUTUBE_ARTICLES_PER_RUN = 0

const MEDIA_PUBLISHER_HOSTS = [
  "fashionsnap.com",
  "fashionsnap-assets.com",
  "fashion-press.net",
  "fullress.com",
  "hypebeast.com",
  "prtimes.jp",
  "sneakerwars.jp",
  "uptodate.tokyo",
]

type RunRecord = { startedAt: string; publishedArticleIds?: string[]; titles?: string[] }
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

function normalizedHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }
}

function hostsSharePublisher(left: string, right: string): boolean {
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`)
}

function isMediaPublisherHost(host: string): boolean {
  return MEDIA_PUBLISHER_HOSTS.some((mediaHost) => hostsSharePublisher(host, mediaHost))
}

function verifiedOfficialHosts(draft: Draft): string[] {
  return (draft.suggestedOfficialLinks ?? [])
    .filter((link) => isSafeExternalUrl(link.url))
    .map((link) => normalizedHost(link.url))
    .filter((host): host is string => host !== null)
    .filter((host) => !isMediaPublisherHost(host))
}

function imageMatchesVerifiedOfficialHost(imageUrl: string, officialHosts: string[]): boolean {
  const imageHost = normalizedHost(imageUrl)
  return Boolean(imageHost && !isMediaPublisherHost(imageHost) && officialHosts.some((host) => hostsSharePublisher(imageHost, host)))
}

/**
 * 人間確認なしで公開できる下書きだけを通す保守的なゲート。
 * 迷う記事は削除せず下書きに残し、通常の管理画面レビューへ回す。
 */
export function autoPublishBlockReasons(draft: Draft): string[] {
  const reasons: string[] = []
  const officialHosts = verifiedOfficialHosts(draft)
  const cover = draft.suggestedCoverImage?.trim() ?? ""
  const coverHost = normalizedHost(cover)
  const text = [draft.title, draft.excerpt, ...draft.bodyParagraphs].join(" ")

  if (draft.status !== "pending") reasons.push("公開待ちではありません")
  if (!hasPublishableTheme(draft)) reasons.push("本文が不足しています")
  if (draft.informationStatus !== "official") reasons.push("公式確認済みではありません")
  if (draft.isSponsored) reasons.push("PR・タイアップ記事です")
  if (draft.contentType === "SNAP" || draft.snapProfile) reasons.push("SNAP・人物情報を含みます")
  if (draft.suggestedYoutubeVideoId || draft.category === "youtube") reasons.push("動画記事は個別確認が必要です")
  if (officialHosts.length === 0) reasons.push("ブランド・店舗の公式リンクを確認できません")
  if (!draft.sourceRefs.some((ref) => isSafeExternalUrl(ref.url))) reasons.push("検証可能な出典がありません")
  if (draft.sourceRefs.some((ref) => /(?:PR\s*TIMES|prtimes\.jp)/i.test(`${ref.name} ${ref.url}`))) {
    reasons.push("プレスリリース由来です")
  }
  if (!draft.suggestedAffiliateSearch[0]?.trim()) reasons.push("商品検索語がありません")
  if (!cover) reasons.push("カバー画像がありません")
  else if (!cover.startsWith("/images/editorial/") && (!coverHost || !imageMatchesVerifiedOfficialHost(cover, officialHosts))) {
    reasons.push("画像の権利元を公式リンクと照合できません")
  }
  if (/(?:Goss!p|Gossp!|未確認情報|リーク|rumou?rs?|leak(?:ed|s|ing)?)/i.test(text)) {
    reasons.push("未確認情報を含みます")
  }
  return [...new Set(reasons)]
}

export function buildRequiredAffiliateLinks(query: string): AffiliateLink[] {
  return QUICK_AFFILIATE_RETAILERS.map((item) => {
    if (!item.build) throw new Error(`${item.retailer}の自動リンク生成が未設定です`)
    return item.build(query)
  })
}

function referenceSourceUrl(draft: Draft): string | null {
  const url = draft.suggestedOfficialLinks?.find((link) => {
    if (!isSafeExternalUrl(link.url)) return false
    const host = normalizedHost(link.url)
    return Boolean(host && !isMediaPublisherHost(host))
  })?.url
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

async function saveArticleImage(imageUrl: string, draft: Draft, name: string): Promise<string> {
  const officialHosts = verifiedOfficialHosts(draft)
  if (!imageMatchesVerifiedOfficialHost(imageUrl, officialHosts)) {
    throw new Error("画像URLを公式ドメインと照合できません")
  }
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DropDropDropImageCollector/1.0; +https://dropx3.com)" },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`公式画像を保存できませんでした(HTTP ${res.status})`)
  if (!imageMatchesVerifiedOfficialHost(res.url, officialHosts)) {
    throw new Error("画像の転送先を公式ドメインと照合できません")
  }
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
  limit = 8
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

export { isSameProductAssetFamily } from "./image-candidates"

async function saveGalleryImages(draft: Draft, coverImageUrl: string): Promise<GalleryImage[]> {
  const candidates = uniqueGalleryCandidates(coverImageUrl, draft.suggestedGalleryImages ?? [])
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
  const galleryImages = draft.suggestedYoutubeVideoId ? [] : await saveGalleryImages(draft, sourceCoverImage)

  // 同じ下書きを再試行しても記事IDを増殖させない。
  const id = generateId(`${draft.id}-${AUTO_PUBLISH_POLICY_VERSION}`)
  const now = new Date().toISOString()
  return {
    id,
    slug: generateSlug(brushed.title, id),
    title: brushed.title,
    excerpt: brushed.excerpt,
    bodyParagraphs: brushed.bodyParagraphs,
    coverImage,
    coverImageAlt: brushed.title,
    // カバーを必須・最優先にし、同一画像を除いた取得可能な追加画像だけを自己ホストして採用する。
    galleryImages,
    ...(draft.suggestedYoutubeVideoId ? { youtubeVideoId: draft.suggestedYoutubeVideoId } : {}),
    category: draft.category,
    contentType: inferContentType(draft.category, affiliateLinks.length > 0),
    ...(draft.informationStatus ? { informationStatus: draft.informationStatus } : {}),
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

  let alreadyStarted = false
  await mutateJson<AutoPublishState>(STATE_PATH, { runs: {} }, (state) => {
    if (state.runs[slot]) alreadyStarted = true
    else state.runs[slot] = { startedAt: now.toISOString() }
    return state
  })
  if (alreadyStarted) return { published: false, publishedCount: 0, slot, skipped: ["この時刻は処理済みです"] }

  const { drafts } = await readDrafts()
  const errors: string[] = []
  const publishedArticles: Article[] = []
  // 安全ゲートを通った通常記事だけを、元情報が新しい順に公開する。
  // YouTubeは公式性と埋め込み可否を個別確認するため、この経路では公開しない。
  const candidates = drafts
    .filter((draft) => autoPublishBlockReasons(draft).length === 0)
    .sort((a, b) => Date.parse(b.sourcePublishedAt ?? b.createdAt) - Date.parse(a.sourcePublishedAt ?? a.createdAt))
  let youtubePublished = 0
  for (const draft of candidates) {
    if (publishedArticles.length >= ARTICLES_PER_AUTO_PUBLISH_RUN) break
    if (draft.suggestedYoutubeVideoId && youtubePublished >= MAX_YOUTUBE_ARTICLES_PER_RUN) continue
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
    state.runs[slot] = {
      startedAt: state.runs[slot]?.startedAt ?? now.toISOString(),
      publishedArticleIds: publishedArticles.map((article) => article.id),
      titles: publishedArticles.map((article) => article.title),
    }
    return state
  })
  return {
    published: publishedArticles.length > 0,
    publishedCount: publishedArticles.length,
    slot,
    titles: publishedArticles.map((article) => article.title),
    skipped: errors.length > 0 ? errors : publishedArticles.length === 0 ? ["下書きがありません"] : [],
  }
}
