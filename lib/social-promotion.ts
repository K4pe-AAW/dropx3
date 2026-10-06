import { buildReleaseCalendar } from "./release-calendar"
import { isMensOrUnisexDraft } from "./article-audience"
import {
  MAX_FASHIONSNAP_ARTICLES_PER_DAY,
  MAX_PR_TIMES_ARTICLES_PER_DAY,
  isFashionsnapSourced,
  isPrTimesSourced,
} from "./article-source"
import { isDomesticBrandContent } from "./domestic-brands"
import { siteConfig } from "./site-config"
import { mutateJson, readArticles } from "./storage"
import type { Article } from "./types"
import { editorialStylingPerspective, editorialVerdict } from "./drop-editorial-voice"

export const SOCIAL_QUEUE_PATH = "data/social-promotion-queue-v1.json"
export const SOCIAL_DAILY_SLOT_TARGET = 16

export type SocialPostKind =
  | "new_article"
  | "release_day"
  | "article_update"
  | "editorial_daily_drop"
  | "editorial_spotlight"
  | "editorial_compare"
  | "editorial_tomorrow"

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
export const SOCIAL_DOMESTIC_BRAND_TARGET = 4
export const SOCIAL_EDITORIAL_TARGET = 4
export const SOCIAL_NEWS_TARGET = SOCIAL_DAILY_SLOT_TARGET - SOCIAL_EDITORIAL_TARGET

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

function trackedSiteUrl(campaign: SocialPostKind): string {
  const url = new URL(siteConfig.url)
  url.searchParams.set("utm_source", "x")
  url.searchParams.set("utm_medium", "social")
  url.searchParams.set("utm_campaign", campaign)
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

function productIdentityKeys(article: Article): string[] {
  const structured = (article.colorways ?? [])
    .map((item) => item.styleCode?.trim().toUpperCase())
    .filter((value): value is string => Boolean(value && value.length >= 5))
  const inline = [article.title, article.excerpt]
    .join(" ")
    .match(/\b[A-Z0-9]{2,}(?:-[A-Z0-9]{2,})+\b/gi)
    ?.filter((value) => /[A-Z]/i.test(value))
    .map((value) => value.toUpperCase()) ?? []
  return [...new Set([...structured, ...inline])]
}

function dedupeByProductIdentity(
  drafts: SocialPostDraft[],
  articleById: Map<string, Article>
): SocialPostDraft[] {
  const seen = new Set<string>()
  return drafts.filter((draft) => {
    const article = articleById.get(draft.articleId)
    if (!article) return false
    const keys = productIdentityKeys(article)
    if (keys.some((key) => seen.has(key))) return false
    keys.forEach((key) => seen.add(key))
    return true
  })
}

function shortItemTitle(article: Article, max = 44): string {
  const clean = compactTitle(article.title, max).replace(/[！!]$/, "")
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`
}

function editorialDraft(
  id: string,
  kind: Extract<SocialPostKind, `editorial_${string}`>,
  text: string,
  article: Article,
  reason: string,
  generatedAt: string,
  url = trackedSiteUrl(kind)
): SocialPostDraft {
  return {
    id: `${id}:${kind}:${jstDate(new Date(generatedAt))}`,
    articleId: id,
    kind,
    // XはURLを短縮URL相当で数えるため、文字列を途中で切ってURLを壊さない。
    text: text.trim(),
    url,
    imageUrl: new URL(article.coverImage, siteConfig.url).toString(),
    reason,
    generatedAt,
    freshnessAt: article.updatedAt ?? article.publishedAt,
  }
}

function buildEditorialDrafts(
  articles: Article[],
  selectedNews: SocialPostDraft[],
  now: Date,
  generatedAt: string
): SocialPostDraft[] {
  const articleById = new Map(articles.map((article) => [article.id, article]))
  const editorialArticles = selectedNews
    .map((draft) => articleById.get(draft.articleId))
    .filter((article): article is Article => Boolean(article))
    .filter((article) => article.informationStatus !== "rumor" && article.informationStatus !== "leak")
    .sort((a, b) => {
      const aPrimary = isPrTimesSourced(a) || isFashionsnapSourced(a) ? 0 : 1
      const bPrimary = isPrTimesSourced(b) || isFashionsnapSourced(b) ? 0 : 1
      return bPrimary - aPrimary || (b.updatedAt ?? b.publishedAt).localeCompare(a.updatedAt ?? a.publishedAt)
    })
  const lead = editorialArticles[0]
  if (!lead) return []

  const top = editorialArticles.slice(0, 3)
  const upcomingWeek = buildReleaseCalendar(articles)
    .filter((item) => {
      const delta = new Date(`${item.date}T00:00:00+09:00`).getTime() - new Date(`${jstDate(now)}T00:00:00+09:00`).getTime()
      return delta >= 0 && delta < 7 * DAY && isSocialPromotionEligible(item.article)
    })
    .map((item) => item.article)
    .filter((article) => article.informationStatus !== "rumor" && article.informationStatus !== "leak")
    .filter((article, index, values) => values.findIndex((item) => item.id === article.id) === index)
    .slice(0, 3)
  const jstDay = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCDay()
  const dailyArticles = jstDay === 0 && upcomingWeek.length > 0 ? upcomingWeek : top
  const dailyLines = dailyArticles.map((article, index) => `${index + 1}. ${shortItemTitle(article, 38)}`).join("\n")
  const dailyUrl = trackedSiteUrl("editorial_daily_drop")
  const daily = editorialDraft(
    "editorial-daily-drop",
    "editorial_daily_drop",
    `${jstDay === 0 ? "今週のDROPカレンダー" : "今日のDROP"}｜注目${dailyArticles.length}選\n\n${dailyLines}\n\n新着一覧 ${dailyUrl}\n#メンズファッション`,
    lead,
    "X内で保存しやすい当日新着まとめ",
    generatedAt,
    dailyUrl
  )

  const verdict = editorialVerdict(lead)
  const spotlightUrl = trackedArticleUrl(lead, "editorial_spotlight")
  const spotlight = editorialDraft(
    `editorial-spotlight-${lead.id}`,
    "editorial_spotlight",
    `DROP判断｜${verdict.label}\n${shortItemTitle(lead, 62)}\n\n${verdict.reason}\n${editorialStylingPerspective(lead, now)}\n\n${spotlightUrl}\n${hashtags(lead)}`,
    lead,
    "事実・判断・合わせ方を分けたDROP編集判断",
    generatedAt,
    spotlightUrl
  )

  const second = editorialArticles[1]
  const compareText = second
    ? `どちらを選ぶ？\n\nA｜${shortItemTitle(lead, 48)}\nB｜${shortItemTitle(second, 48)}\n\n今の気分に近い方を返信で教えてください。\n#メンズファッション`
    : `どう合わせる？\n\n${shortItemTitle(lead, 58)}\n\nデニム／スラックス／ワイドパンツ。合わせたいスタイルを返信で教えてください。\n#メンズファッション`
  const compare = editorialDraft(
    `editorial-compare-${lead.id}${second ? `-${second.id}` : ""}`,
    "editorial_compare",
    compareText,
    lead,
    "リンクを前面に出さない比較・会話投稿",
    generatedAt
  )

  const tomorrow = new Date(now.getTime() + DAY)
  const tomorrowDate = jstDate(tomorrow)
  const tomorrowArticles = buildReleaseCalendar(articles)
    .filter((item) => item.date === tomorrowDate && isSocialPromotionEligible(item.article))
    .map((item) => item.article)
    .filter((article) => article.informationStatus !== "rumor" && article.informationStatus !== "leak")
    .filter((article, index, values) => values.findIndex((item) => item.id === article.id) === index)
    .slice(0, 3)
  const tomorrowLead = tomorrowArticles[0] ?? lead
  const tomorrowLines = tomorrowArticles.length > 0
    ? tomorrowArticles.map((article) => `・${shortItemTitle(article, 45)}`).join("\n")
    : `・${shortItemTitle(lead, 45)}\n・発売・再販情報は確認でき次第更新`
  const tomorrowUrl = trackedSiteUrl("editorial_tomorrow")
  const tomorrowDraft = editorialDraft(
    "editorial-tomorrow",
    "editorial_tomorrow",
    `明日のDROP｜買い逃し防止メモ\n\n${tomorrowLines}\n\n最新情報 ${tomorrowUrl}\n#メンズファッション`,
    tomorrowLead,
    tomorrowArticles.length > 0 ? "翌日発売の事前まとめ" : "翌日候補不足時の更新予告",
    generatedAt,
    tomorrowUrl
  )

  return [daily, spotlight, compare, tomorrowDraft]
}

function interleaveEditorialPosts(news: SocialPostDraft[], editorial: SocialPostDraft[], limit: number): SocialPostDraft[] {
  const editorialSlots = new Map([[0, 0], [5, 1], [11, 2], [14, 3]])
  const result: SocialPostDraft[] = []
  let newsIndex = 0
  for (let slot = 0; slot < limit; slot += 1) {
    const editorialIndex = editorialSlots.get(slot)
    if (editorialIndex !== undefined && editorial[editorialIndex]) {
      result.push(editorial[editorialIndex])
    } else if (news[newsIndex]) {
      result.push(news[newsIndex++])
    }
  }
  return result
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
 * 同一記事は1候補にまとめ、24時間以内の新着 > 24時間以内の更新 > 発売当日 >
 * 24〜48時間の新着の順で並べる。発売日が今日でも、古い記事が新着を押し出さないようにする。
 * IDへJST日付を含めるため、同一日内は重複せず、翌日以降は再投稿候補になれる。
 */
export function buildSocialPostDrafts(
  articles: Article[],
  now = new Date(),
  limit = SOCIAL_DAILY_SLOT_TARGET,
  options: { dedupeProducts?: boolean } = {}
): SocialPostDraft[] {
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
    const updatedAge = now.getTime() - updated
    if (Number.isFinite(updated) && updated > published + 60 * 60 * 1000 && updatedAge >= 0 && updatedAge <= DAY) {
      byArticle.set(article.id, makeDraft(article, "article_update", "24時間以内に販売・発売情報を更新", generatedAt))
      continue
    }
    const publishedAge = now.getTime() - published
    if (publishedAge >= 0 && publishedAge <= 48 * 60 * 60 * 1000) {
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

  const articleById = new Map(articles.map((article) => [article.id, article]))
  const freshnessPriority = (draft: SocialPostDraft): number => {
    const article = articleById.get(draft.articleId)
    if (!article) return 0
    const publishedAge = now.getTime() - Date.parse(article.publishedAt)
    if (publishedAge >= 0 && publishedAge <= DAY) return 4
    const published = Date.parse(article.publishedAt)
    const updated = Date.parse(article.updatedAt ?? "")
    const updatedAge = now.getTime() - updated
    if (Number.isFinite(updated) && updated > published + 60 * 60 * 1000 && updatedAge >= 0 && updatedAge <= DAY) return 3
    if (draft.kind === "release_day") return 2
    return 1
  }
  const sortedByFreshness = [...byArticle.values()]
    .sort((a, b) => freshnessPriority(b) - freshnessPriority(a) || b.freshnessAt.localeCompare(a.freshnessAt))
  const sorted = options.dedupeProducts
    ? dedupeByProductIdentity(sortedByFreshness, articleById)
    : sortedByFreshness
  const domesticTarget = Math.min(SOCIAL_DOMESTIC_BRAND_TARGET, limit)
  const domestic = sorted.filter((draft) => {
    const article = articleById.get(draft.articleId)
    return article ? isDomesticBrandContent(article) : false
  })
  const others = sorted.filter((draft) => {
    const article = articleById.get(draft.articleId)
    return article ? !isDomesticBrandContent(article) : true
  })
  const blended: SocialPostDraft[] = []
  let domesticIndex = 0
  let otherIndex = 0
  while (domesticIndex < Math.min(domesticTarget, domestic.length) || otherIndex < others.length) {
    if (domesticIndex < Math.min(domesticTarget, domestic.length)) {
      blended.push(domestic[domesticIndex++])
    }
    for (let count = 0; count < 3 && otherIndex < others.length; count += 1) {
      blended.push(others[otherIndex++])
    }
  }
  const mensTarget = Math.ceil(limit * SOCIAL_MENS_SHARE)
  const otherLimit = Math.max(0, limit - mensTarget)
  let mensCount = 0
  let otherCount = 0
  let prTimesCount = 0
  let fashionsnapCount = 0

  const news = blended.filter((draft) => {
    const article = articleById.get(draft.articleId)
    if (!article) return false
    const fromPrTimes = isPrTimesSourced(article)
    const fromFashionsnap = isFashionsnapSourced(article)
    if (fromPrTimes && prTimesCount >= MAX_PR_TIMES_ARTICLES_PER_DAY) return false
    if (fromFashionsnap && fashionsnapCount >= MAX_FASHIONSNAP_ARTICLES_PER_DAY) return false
    const isMens = article ? isMensOrUnisexDraft(article) : false
    if (!isMens) {
      if (otherCount >= otherLimit) return false
      otherCount += 1
    } else {
      if (mensCount >= mensTarget) return false
      mensCount += 1
    }
    if (fromPrTimes) prTimesCount += 1
    if (fromFashionsnap) fashionsnapCount += 1
    return true
  }).slice(0, limit)

  return news
}

/** Typefullyの16枠を、速報12枠とDROP独自の編集投稿4枠で編成する。 */
export function buildSocialQueueDrafts(
  articles: Article[],
  now = new Date(),
  limit = SOCIAL_DAILY_SLOT_TARGET
): SocialPostDraft[] {
  if (limit !== SOCIAL_DAILY_SLOT_TARGET) {
    return buildSocialPostDrafts(articles, now, limit, { dedupeProducts: true })
  }
  const generatedAt = now.toISOString()
  // 編集投稿4件もメンズ中心なので、速報側は12件すべてメンズでも全体方針に合う。
  // 13件分の比率枠で選んでから12件へ絞り、従来の「その他最大1件」も維持する。
  const news = buildSocialPostDrafts(articles, now, SOCIAL_NEWS_TARGET + 1, { dedupeProducts: true })
    .slice(0, SOCIAL_NEWS_TARGET)
  const editorial = buildEditorialDrafts(articles, news, now, generatedAt).slice(0, SOCIAL_EDITORIAL_TARGET)
  return interleaveEditorialPosts(news, editorial, limit)
}

export async function refreshSocialQueue(now = new Date()): Promise<SocialQueueState> {
  const { articles } = await readArticles()
  const state: SocialQueueState = {
    generatedAt: now.toISOString(),
    mode: "typefully",
    drafts: buildSocialQueueDrafts(articles, now),
  }
  await mutateJson<SocialQueueState>(SOCIAL_QUEUE_PATH, { mode: "typefully", drafts: [] }, () => state)
  return state
}
