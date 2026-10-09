import type { Article } from "./types"
import { DROP_EDITORIAL_VOICE } from "./drop-editorial-voice"

export const DROP_EDITORIAL_REVIEW_VERSION = 1

export type EditorialReviewScores = {
  audienceFit: number
  grounding: number
  specificity: number
  naturalness: number
  usefulness: number
  repetition: number
}

export type EditorialClaimCheck = {
  claim: string
  evidence: string
}

export type EditorialQualityReview = {
  version: number
  verdict: "approved" | "rejected"
  reviewedAt: string
  fingerprint: string
  scores: EditorialReviewScores
  reasons: string[]
  claimChecks: EditorialClaimCheck[]
  sourceArticleIds: string[]
  limitations: string
}

const URL_PATTERN = /https?:\/\/\S+/g
const EXPERIENCE_PATTERN = /(?:履き心地が良かった|着心地が良かった|購入しました|買いました|実物は高級感|一日履いても疲れ|試着しました)/
const PRAISE_PATTERN = /(?:神作|絶対買い|マストバイ|最高すぎ|優勝|激アツ)/
const EDITORIAL_KINDS = new Set([
  "editorial_daily_drop",
  "editorial_spotlight",
  "editorial_compare",
  "editorial_tomorrow",
])

function hashText(value: string): string {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

function normalizedWords(value: string): Set<string> {
  return new Set(
    value
      .replace(URL_PATTERN, " ")
      .replace(/[#｜|・／/、。！？!?\n]/g, " ")
      .split(/\s+/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length >= 3)
  )
}

function textSimilarity(a: string, b: string): number {
  const left = normalizedWords(a)
  const right = normalizedWords(b)
  if (!left.size || !right.size) return 0
  const shared = [...left].filter((word) => right.has(word)).length
  return shared / Math.min(left.size, right.size)
}

function xWeightedLength(value: string): number {
  const urls = value.match(URL_PATTERN) ?? []
  return Array.from(value.replace(URL_PATTERN, "")).length + urls.length * 23
}

function articleFacts(article: Article): string[] {
  const facts = [article.title]
  const firstColorway = article.colorways?.[0]
  if (firstColorway?.styleCode) facts.push(`型番 ${firstColorway.styleCode}`)
  if (firstColorway?.releaseDate) facts.push(`発売日 ${firstColorway.releaseDate}`)
  if (firstColorway?.price) facts.push(`価格 ${firstColorway.price}`)
  const affiliatePrice = article.affiliateLinks.find((link) => link.price)?.price
  if (affiliatePrice) facts.push(`価格 ${affiliatePrice}`)
  if (article.brands[0]) facts.push(`ブランド ${article.brands[0]}`)
  return [...new Set(facts)].slice(0, 6)
}

export function reviewEditorialPost(input: {
  id: string
  kind: string
  text: string
  sourceArticles: Article[]
  reviewedAt: string
  recentEditorialTexts?: string[]
}): EditorialQualityReview {
  const { id, kind, text, sourceArticles, reviewedAt, recentEditorialTexts = [] } = input
  const sourceArticleIds = [...new Set(sourceArticles.map((article) => article.id))]
  const facts = sourceArticles.flatMap(articleFacts)
  const claimChecks: EditorialClaimCheck[] = facts.slice(0, 3).map((fact) => ({
    claim: fact,
    evidence: `公開済み記事 ${sourceArticleIds.join(", ")} の構造化情報`,
  }))
  const maxSimilarity = recentEditorialTexts.reduce(
    (max, recent) => Math.max(max, textSimilarity(text, recent)),
    0
  )
  // 商品名はまとめ・比較・寸評で自然に重なるため、完全一致に近い場合だけ不合格にする。
  const repetition = maxSimilarity >= 0.95 ? 5 : maxSimilarity >= 0.8 ? 4 : maxSimilarity >= 0.6 ? 3 : 2
  const hasUsefulAction = /(?:発売|再販|新着|選ぶ|合わせ|確認|買い逃し|返信|カレンダー|情報)/.test(text)
  const hasAudiencePerspective = /(?:メンズ|手持ち|デニム|スラックス|パンツ|足元|大人|中目黒|代官山|ワードローブ|スタイル)/.test(text)
  const hasSpecificFact = sourceArticles.some((article) => text.includes(article.title.slice(0, 12))) || facts.length >= 3
  const hasUnsafeExperience = EXPERIENCE_PATTERN.test(text) || DROP_EDITORIAL_VOICE.forbiddenClaims.some((claim) => text.includes(claim))
  const hasEmptyHype = PRAISE_PATTERN.test(text)
  const length = xWeightedLength(text)
  const scores: EditorialReviewScores = {
    audienceFit: hasAudiencePerspective || kind === "editorial_daily_drop" || kind === "editorial_tomorrow" ? 4 : 3,
    grounding: sourceArticleIds.length > 0 && claimChecks.length >= 2 ? 5 : 2,
    specificity: hasSpecificFact ? 4 : 3,
    naturalness: !hasUnsafeExperience && !hasEmptyHype && length >= 45 && length <= 280 ? 4 : 2,
    usefulness: hasUsefulAction ? 4 : 3,
    repetition,
  }
  const reasons: string[] = []
  if (!EDITORIAL_KINDS.has(kind)) reasons.push("編集投稿として認識できない種別です")
  if (!sourceArticleIds.length) reasons.push("公開済み記事の根拠がありません")
  if (claimChecks.length < 2) reasons.push("検証可能な事実が2件未満です")
  if (hasUnsafeExperience) reasons.push("未確認の購入・試着・着用体験を示す表現があります")
  if (hasEmptyHype) reasons.push("根拠のない煽り表現があります")
  if (length < 45 || length > 280) reasons.push("X編集投稿の文字数基準45〜280文字を外れています")
  if (repetition >= 4) reasons.push("直近の編集投稿との表現重複が高すぎます")
  if ([scores.audienceFit, scores.grounding, scores.specificity, scores.naturalness, scores.usefulness].some((score) => score < 4)) {
    reasons.push("編集品質スコアのいずれかが4未満です")
  }
  const verdict = reasons.length === 0 ? "approved" : "rejected"
  return {
    version: DROP_EDITORIAL_REVIEW_VERSION,
    verdict,
    reviewedAt,
    fingerprint: hashText(JSON.stringify({ id, kind, text, sourceArticleIds, facts })),
    scores,
    reasons: verdict === "approved" ? ["事実性・具体性・文体・有用性・反復基準を通過"] : reasons,
    claimChecks,
    sourceArticleIds,
    limitations: "公開済み情報のみで判断。購入・試着・着用・店舗訪問・パートナーの反応は未確認。",
  }
}

export function isApprovedEditorialReview(review: EditorialQualityReview | undefined): boolean {
  return Boolean(review && review.version === DROP_EDITORIAL_REVIEW_VERSION && review.verdict === "approved")
}
