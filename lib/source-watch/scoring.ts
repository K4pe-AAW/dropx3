import type { ConfidenceTier, ProductReadiness, SourceLinkType } from "./types"

const OFFICIAL_LINK_TYPES: SourceLinkType[] = ["official_news", "official_product", "official_social", "press_release"]

/**
 * 公式確認フラグ。国内正規販売店(retailerカテゴリ)からの掲載も「国内正規販売店で確認できた情報」として
 * CONFIRMED扱いにする(ユーザー指定ルール)。
 */
export function determineOfficialConfirmed(linkType: SourceLinkType, isAuthorizedRetailer: boolean): boolean {
  return OFFICIAL_LINK_TYPES.includes(linkType) || isAuthorizedRetailer
}

/**
 * 国内発売確認フラグ。海外発売日(overseasReleaseDate)だけでは絶対にtrueにしない
 * (「海外発売日を日本発売日として表示しない」というユーザー指定ルールの核心部分)。
 * 明示的な国内発売日、または国内正規販売店からの掲載がある場合のみtrueにする。
 */
export function determineDomesticConfirmed(domesticReleaseDate: string | null, isAuthorizedRetailer: boolean): boolean {
  return Boolean(domesticReleaseDate) || isAuthorizedRetailer
}

/**
 * 複数ソースで同じ商品が確認できた場合にスコアを上げる。
 * 単純な固定値ではなく、最高スコアのソースを基準に、他ソースからの裏取り1件ごとに+5(上限+15=3ソース分)する。
 * contributingScores は「同じProductに寄与している、ソースごとに重複排除済みのsourceScore一覧」を渡すこと。
 */
export function computeCorroboratedScore(contributingScores: number[]): number {
  if (contributingScores.length === 0) return 0
  const max = Math.max(...contributingScores)
  const corroborationBonus = Math.min(15, 5 * (contributingScores.length - 1))
  return Math.min(100, max + corroborationBonus)
}

export type TierInput = {
  /** ブランド公式または国内正規販売店(retailerカテゴリでsourceScore>=90)のSourceLinkが1件でもあるか */
  hasOfficialOrAuthorizedRetailerLink: boolean
  /** early_media/domestic_media/retailer/press カテゴリの、重複排除済み distinct ソース数 */
  reliableSourceCount: number
}

/**
 * CONFIRMED: ブランド公式 or 国内正規販売店で確認
 * REPORTED: 公式未確認だが、信頼できる複数ソースが報じている(1ソースのみはRUMOR)
 * RUMOR: それ以外(単一の早期情報・SNS等)
 */
export function classifyTier(input: TierInput): ConfidenceTier {
  if (input.hasOfficialOrAuthorizedRetailerLink) return "CONFIRMED"
  if (input.reliableSourceCount >= 2) return "REPORTED"
  return "RUMOR"
}

export type ReadinessInput = {
  tier: ConfidenceTier
  officialConfirmed: boolean
  hasProductName: boolean
  hasBrand: boolean
  hasStyleCode: boolean
  hasReleaseDate: boolean
  hasPrice: boolean
  domesticConfirmed: boolean
  /** 画像候補が1件以上あり、かつ少なくとも1件が自動利用可能(lib/source-watch/image-rights.ts) */
  hasSafeImage: boolean
  /** 画像候補は存在するが、自動利用可能なものが1件もない(=Rights不明のまま) */
  hasUnresolvedImageRights: boolean
  hasAccuratePurchaseLink: boolean
  hasRelatedArticle: boolean
  sourceLinkCount: number
  isDuplicate: boolean
  domesticClaimedWithoutConfirmation: boolean
  priceGuessedWithoutSource: boolean
}

export type ReadinessResult = {
  score: number
  breakdown: Record<string, number>
  readiness: ProductReadiness
  blockReasons: string[]
}

const POINTS = {
  officialSource: 20,
  nameAndBrand: 10,
  styleCode: 10,
  releaseDate: 10,
  price: 10,
  domestic: 10,
  safeImage: 15,
  purchaseLink: 10,
  relatedArticles: 5,
} as const

/**
 * 100点満点の完成度スコア。CONFIRMED/REPORTED/RUMORという「情報源の信頼度」とは別軸の
 * 「記事化に必要な材料が揃っているか」を表す。ブロック条件が1つでも該当すれば、
 * 点数に関係なくreadinessはHOLD固定になる(ユーザー指定ルール)。
 */
export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const breakdown: Record<string, number> = {
    officialSource: input.officialConfirmed ? POINTS.officialSource : 0,
    nameAndBrand: input.hasProductName && input.hasBrand ? POINTS.nameAndBrand : 0,
    styleCode: input.hasStyleCode ? POINTS.styleCode : 0,
    releaseDate: input.hasReleaseDate ? POINTS.releaseDate : 0,
    price: input.hasPrice ? POINTS.price : 0,
    domestic: input.domesticConfirmed ? POINTS.domestic : 0,
    safeImage: input.hasSafeImage ? POINTS.safeImage : 0,
    purchaseLink: input.hasAccuratePurchaseLink ? POINTS.purchaseLink : 0,
    relatedArticles: input.hasRelatedArticle ? POINTS.relatedArticles : 0,
  }
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0)

  const blockReasons: string[] = []
  if (input.tier === "RUMOR") blockReasons.push("RUMOR: 原則公開しない")
  if (input.hasUnresolvedImageRights) blockReasons.push("画像Rights不明")
  if (input.sourceLinkCount === 0) blockReasons.push("情報元なし")
  if (!input.hasProductName) blockReasons.push("商品名なし")
  if (input.isDuplicate) blockReasons.push("重複商品")
  if (input.domesticClaimedWithoutConfirmation) blockReasons.push("国内発売未確認なのに国内発売と断定")
  if (input.priceGuessedWithoutSource) blockReasons.push("価格不明なのに推測価格を記載")

  const readiness: ProductReadiness =
    blockReasons.length > 0 ? "HOLD" : score >= 80 ? "READY" : score >= 60 ? "REVIEW" : "HOLD"

  return { score, breakdown, readiness, blockReasons }
}
