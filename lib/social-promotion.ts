import { buildReleaseCalendar } from "./release-calendar"
import { isMensOrUnisexDraft } from "./article-audience"
import { siteConfig } from "./site-config"
import { mutateJson, readArticles } from "./storage"
import type { Article } from "./types"

export const SOCIAL_QUEUE_PATH = "data/social-promotion-queue-v1.json"

export type SocialPostKind = "new_article" | "release_day" | "article_update"

export type SocialPostDraft = {
  id: string
  articleId: string
  kind: SocialPostKind
  text: string
  url: string
  imageUrl: string
  reason: string
  generatedAt: string
  freshnessAt: string
}

export type SocialQueueState = {
  generatedAt?: string
  mode: "typefully"
  drafts: SocialPostDraft[]
}

const DAY = 86_400_000
export const SOCIAL_MENS_SHARE = 0.9

const NON_COMMERCE_EVENT_TERMS = [
  /ワークショップ/i,
  /市民参加/i,
  /地域(?:振興|交流|活性化)/i,
  /産業観光/i,
  /(?:講演|講演会|セミナー|シンポジウム|サミット|工場見学)/i,
]

const COMMERCE_EVENT_TERMS = [
  /(?:発売|販売|先行販売|再販|予約|受注|抽選|入荷)/i,
  /(?:限定商品|限定アイテム|新作|コレクション)/i,
  /(?:ポップアップ|POP[ -]?UP|期間限定ストア)/i,
]

const NON_FASHION_PRODUCT_TERMS = [
  /(?:冷蔵庫|冷凍庫|洗濯機|乾燥機|掃除機|炊飯器|電子レンジ|オーブン|エアコン|テレビ|家電)/i,
  /(?:羊羹|ようかん|和菓子|洋菓子|菓子|スイーツ|チョコレート|アイスクリーム|パン|コーヒー|食品|飲料|ドリンク|メニュー)/i,
  /(?:レストラン|カフェ|居酒屋|飲食店|グルメ)/i,
]

const FASHION_PRODUCT_TERMS = [
  /(?:ファッション|アパレル|ウェア|コレクション|ルック|コーデ)/i,
  /(?:スニーカー|シューズ|ブーツ|サンダル|ローファー|パンプス|靴)/i,
  /(?:Tシャツ|ティーシャツ|シャツ|ジャケット|コート|ブルゾン|パーカ|フーディ|スウェット|ニット|パンツ|デニム|スカート|ドレス|ワンピース)/i,
  /(?:バッグ|財布|キャップ|ハット|アクセサリー|ジュエリー|腕時計|サングラス)/i,
]

const FASHION_CATEGORIES = new Set<Article["category"]>([
  "tops",
  "pants",
  "jacket",
  "apparel",
  "boots",
  "sneaker",
  "accessory",
  "vintage",
])

function jstDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

function trackedArticleUrl(article: Article, campaign: SocialPostKind): string {
  const url = new URL(`/articles/${article.slug}`, siteConfig.url)
  url.searchParams.set("utm_source", "x")
  url.searchParams.set("utm_medium", "social")
  url.searchParams.set("utm_campaign", campaign)
  url.searchParams.set("utm_content", article.id.slice(0, 12))
  return url.toString()
}

function compactTitle(title: string, max = 88): string {
  const clean = title.replace(/^\s*(?:Goss!p|Gossp!|RUMOR|噂)\s*[｜|:]\s*/i, "").trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`
}

function informationPrefix(article: Article): string | null {
  if (article.informationStatus === "rumor") return "Goss!p・未確認"
  if (article.informationStatus === "leak") return "リーク・未確認"
  return null
}

function hashtags(article: Article): string {
  const candidates = [article.brands[0], article.category === "sneaker" ? "スニーカー" : "ファッション"]
  return candidates
    .filter(Boolean)
    .map((value) => `#${String(value).replace(/[\s#&/]+/g, "")}`)
    .slice(0, 2)
    .join(" ")
}

function makeDraft(article: Article, kind: SocialPostKind, reason: string, generatedAt: string): SocialPostDraft {
  const title = compactTitle(article.title)
  const eventPrefix = kind === "release_day" ? "本日発売" : kind === "article_update" ? "販売情報を更新" : "NEW"
  const statusPrefix = informationPrefix(article)
  const prefix = statusPrefix ? `${statusPrefix}｜${eventPrefix}` : eventPrefix
  const url = trackedArticleUrl(article, kind)
  const tagLine = hashtags(article)
  const excerpt = article.excerpt.replace(/\s+/g, " ").trim().slice(0, 72)
  const text = `${prefix}｜${title}\n\n${excerpt}${excerpt.length >= 72 ? "…" : ""}\n\n${url}\n${tagLine}`.trim()
  return {
    id: `${article.id}:${kind}:${jstDate(new Date(generatedAt))}`,
    articleId: article.id,
    kind,
    text: text.length <= 280 ? text : `${prefix}｜${title}\n\n${url}\n${tagLine}`.trim(),
    url,
    imageUrl: new URL(article.coverImage, siteConfig.url).toString(),
    reason,
    generatedAt,
    freshnessAt: article.updatedAt ?? article.publishedAt,
  }
}

/**
 * 地域振興や参加体験が主目的で、商品発売・販売へつながらない催事記事はXへ出さない。
 * ブランドのポップアップ、限定販売、新作発表など読者が商品を探せるイベントは残す。
 */
export function isSocialPromotionEligible(article: Article): boolean {
  const text = [
    article.title,
    article.excerpt,
    ...article.bodyParagraphs,
    ...(article.tags ?? []),
  ].join(" ")
  const isNonFashionProduct = NON_FASHION_PRODUCT_TERMS.some((pattern) => pattern.test(text))
  const hasFashionProduct = FASHION_PRODUCT_TERMS.some((pattern) => pattern.test(text))
  if (isNonFashionProduct && !hasFashionProduct) return false
  if (!FASHION_CATEGORIES.has(article.category) && !hasFashionProduct) return false
  const isNonCommerceEvent = NON_COMMERCE_EVENT_TERMS.some((pattern) => pattern.test(text))
  if (!isNonCommerceEvent) return true
  return COMMERCE_EVENT_TERMS.some((pattern) => pattern.test(text))
}

/**
 * Xへ出す価値が高い記事だけを選ぶ。Goss!p/リークは未確認表示を残したまま候補に含める。
 * 同一記事は発売当日 > 更新 > 新着の順で1候補にまとめ、タイムラインの重複を避ける。
 * IDへJST日付を含めるため、同一日内は重複せず、翌日以降は再投稿候補になれる。
 */
export function buildSocialPostDrafts(articles: Article[], now = new Date(), limit = 12): SocialPostDraft[] {
  const generatedAt = now.toISOString()
  const today = jstDate(now)
  const byArticle = new Map<string, SocialPostDraft>()

  for (const item of buildReleaseCalendar(articles)) {
    if (item.date !== today) continue
    if (!isSocialPromotionEligible(item.article)) continue
    byArticle.set(item.article.id, makeDraft(item.article, "release_day", `発売日: ${item.date}`, generatedAt))
  }

  for (const article of articles) {
    if (!isSocialPromotionEligible(article)) continue
    if (byArticle.has(article.id)) continue
    const published = Date.parse(article.publishedAt)
    const updated = Date.parse(article.updatedAt ?? "")
    if (Number.isFinite(updated) && updated > published + 60 * 60 * 1000 && now.getTime() - updated <= DAY) {
      byArticle.set(article.id, makeDraft(article, "article_update", "24時間以内に販売・発売情報を更新", generatedAt))
      continue
    }
    if (now.getTime() - published <= 48 * 60 * 60 * 1000) {
      const hasConcreteInfo = Boolean(
        article.colorways?.some((item) => item.styleCode || item.releaseDate || item.price) ||
        article.purchaseChannels?.some((item) => item.date || item.url) ||
        article.officialLinks.length > 0
      )
      if (hasConcreteInfo) {
        byArticle.set(article.id, makeDraft(article, "new_article", "公式・商品情報がある48時間以内の新着", generatedAt))
      }
    }
  }

  const priority: Record<SocialPostKind, number> = { release_day: 3, article_update: 2, new_article: 1 }
  const sorted = [...byArticle.values()]
    .sort((a, b) => priority[b.kind] - priority[a.kind] || b.freshnessAt.localeCompare(a.freshnessAt))
  const articleById = new Map(articles.map((article) => [article.id, article]))
  const mensTarget = Math.ceil(limit * SOCIAL_MENS_SHARE)
  const otherLimit = Math.max(0, limit - mensTarget)
  let mensCount = 0
  let otherCount = 0

  return sorted.filter((draft) => {
    const article = articleById.get(draft.articleId)
    const isMens = article ? isMensOrUnisexDraft(article) : false
    if (!isMens) {
      if (otherCount >= otherLimit) return false
      otherCount += 1
      return true
    }
    if (mensCount >= mensTarget) return false
    mensCount += 1
    return true
  }).slice(0, limit)
}

export async function refreshSocialQueue(now = new Date()): Promise<SocialQueueState> {
  const { articles } = await readArticles()
  const state: SocialQueueState = {
    generatedAt: now.toISOString(),
    mode: "typefully",
    drafts: buildSocialPostDrafts(articles, now),
  }
  await mutateJson<SocialQueueState>(SOCIAL_QUEUE_PATH, { mode: "typefully", drafts: [] }, () => state)
  return state
}
