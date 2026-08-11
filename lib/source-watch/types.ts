// SOURCE WATCH: 情報源監視 → 新着検出 → 商品抽出 → 一次情報確認 → 画像権利判定 → 人間レビュー、
// のパイプライン専用の型定義。既存のArticle/Draft(lib/types.ts)とは独立させ、
// 「記事候補」が固まった時点でDraftへ変換する(lib/source-watch/draft-builder.ts)。

export type SourceCategory =
  | "official" // ブランド公式
  | "press" // プレスリリース配信 (PR TIMES等)
  | "retailer" // 正規販売店・SNKRS等
  | "early_media" // 海外速報系スニーカーメディア
  | "domestic_media" // 国内ファッション/スニーカーメディア
  | "resale" // 中古・二次流通
  | "social" // SNS

export type MonitoringMethod = "rss" | "sitemap" | "html" | "api" | "manual"

export type ImagePolicy =
  | "press_assets_available" // ブランド公式のプレス素材/Media Kitが確認できている
  | "affiliate_assets" // ASP等が提供する商品画像を使ってよい
  | "embed_only" // 埋め込み表示のみ許可(保存・自己ホスト不可)
  | "unknown" // 未調査。安全側でreview_required扱い
  | "do_not_use" // このソースの画像は使用しない(自社撮影メディア等)

/**
 * 初期スコアの目安(ユーザー指定値)。SourceCategoryの語彙と1:1対応しないため、
 * このファイル内で判断根拠をコメントしておく。実値はSource.sourceScoreで
 * ソースごとに上書き可能(固定ではない)。
 */
export const DEFAULT_SOURCE_SCORE_BY_CATEGORY: Record<SourceCategory, number> = {
  official: 100, // OFFICIAL
  press: 95, // DIRECT PRESS (PR TIMES等のプレスリリース配信)
  retailer: 90, // OFFICIAL RETAILER
  domestic_media: 75, // MAJOR MEDIA (UP TO DATE/Fullress/HYPEBEAST JP等の国内確立メディア)
  early_media: 65, // SNEAKER MEDIA (Sole Retriever/Sneaker Files/Sneaker News等)
  resale: 40, // 指定表には無いカテゴリ。ニュース性より在庫/相場の参考情報として扱うためSOCIAL RUMORとSNEAKER MEDIAの中間に設定
  social: 30, // SOCIAL RUMOR
}

export type Source = {
  id: string
  name: string
  /** 表示用の代表URL。ドメインが未確認のソースはundefinedのまま登録できる(enabledは強制false) */
  url?: string
  /** RSS/SitemapのURL。html/manual/apiの場合は省略可 */
  feedUrl?: string
  category: SourceCategory
  sourceScore: number
  country?: string
  brands?: string[]
  monitoringMethod: MonitoringMethod
  monitoringIntervalMinutes: number
  enabled: boolean
  imagePolicy: ImagePolicy
  notes?: string
  createdAt: string
  updatedAt: string
}

export type SourceItemStatus = "new" | "analyzing" | "processed" | "duplicate" | "ignored" | "error"

export type SourceItem = {
  id: string
  sourceId: string
  sourceUrl: string
  title: string
  publishedAt?: string
  detectedAt: string
  rawText?: string
  rawMetadata?: Record<string, unknown>
  processingStatus: SourceItemStatus
  /** html方式の変更検出用。同一URLでも内容が変わっていなければ再解析しない */
  contentHash?: string
  extracted?: ExtractedProductInfo
  /** 商品マッチング後にリンクされるProduct.id */
  productId?: string
}

/**
 * SourceItemから抽出できた範囲の商品情報。抽出できなかった項目は必ずnull
 * (AIによる補完・捏造は禁止 — lib/source-watch/extract.ts参照)。
 */
export type ExtractedProductInfo = {
  brand: string | null
  productName: string | null
  modelName: string | null
  styleCode: string | null
  colorway: string | null
  category: string | null
  releaseDate: string | null
  overseasReleaseDate: string | null
  domesticReleaseDate: string | null
  price: string | null
  currency: string | null
  salesRegion: string | null
  collabPartner: string | null
  retailers: string[] | null
  lotteryInfo: string | null
  /** true=再販, false=新作, null=不明 */
  isReissue: boolean | null
  imageCandidates: string[] | null
}

export type ConfidenceTier = "CONFIRMED" | "REPORTED" | "RUMOR"

export type SourceLinkType =
  | "official_news"
  | "official_product"
  | "official_social"
  | "press_release"
  | "retailer"
  | "media"
  | "rumor"

/** 情報元リンク。購入リンク(PurchaseLinkCandidate)とは完全に別データとして管理する */
export type SourceLink = {
  id: string
  sourceItemId?: string
  publisher: string
  url: string
  type: SourceLinkType
  sourceScore: number
  checkedAt: string
}

export type ImageSourceType =
  | "official_press"
  | "direct_press"
  | "pr_service"
  | "affiliate_asset"
  | "official_store"
  | "official_social"
  | "retailer"
  | "third_party_media"
  | "editorial_placeholder"

export type ImageRightsStatus =
  | "approved"
  | "permission_received"
  | "terms_confirmed"
  | "embed_only"
  | "review_required"
  | "prohibited"

export type ImageAsset = {
  id: string
  productId?: string
  sourceItemId?: string
  url: string
  sourceUrl: string
  rightsUrl?: string
  sourceType: ImageSourceType
  rightsStatus: ImageRightsStatus
  creditText?: string
  permissionReference?: string
  allowedToDownload?: boolean
  allowedToCache?: boolean
  allowedToCrop?: boolean
  editorialUseOnly?: boolean
  width?: number
  height?: number
  checkedAt: string
}

export type PurchaseLinkKind =
  | "official_product"
  | "official_lottery"
  | "domestic_retailer"
  | "domestic_ec"
  | "search"
  | "brand_top"

/** 購入リンク候補。情報元リンク(SourceLink)とは完全に別データ */
export type PurchaseLinkCandidate = {
  label: string
  url: string
  kind: PurchaseLinkKind
  /** true の場合、記事側では「購入する」ではなく「公式サイトを見る」表記にする */
  isBrandTopOnly: boolean
}

export type ProductColorwayCandidate = {
  colorName: string | null
  styleCode: string | null
  price: string | null
  size: string | null
  releaseDate: string | null
  retailers: string[]
  imageAssetIds: string[]
}

export type ProductReadiness = "READY" | "REVIEW" | "HOLD"
export type ProductReviewStatus = "pending" | "held" | "ignored" | "drafted"

export type Product = {
  id: string
  normalizedBrand: string | null
  normalizedModelName: string | null
  styleCode: string | null
  brand: string | null
  productName: string | null
  category: string | null
  tier: ConfidenceTier
  sourceScore: number
  officialConfirmed: boolean
  domesticConfirmed: boolean
  /** 抽選情報(応募期間・条件等)。情報源に記載が無ければnull(捏造しない) */
  lotteryInfo: string | null
  colorways: ProductColorwayCandidate[]
  sourceItemIds: string[]
  sourceLinkIds: string[]
  imageAssetIds: string[]
  purchaseLinkCandidates: PurchaseLinkCandidate[]
  reviewStatus: ProductReviewStatus
  readiness: ProductReadiness
  readinessScore: number
  readinessBreakdown: Record<string, number>
  blockReasons: string[]
  firstDetectedAt: string
  updatedAt: string
  /** 「記事候補を見る」でDraftを生成した後、そのDraft.idを覚えておく(二重生成防止) */
  draftId?: string
}

export type RobotsVerdict = "allowed" | "disallowed" | "unknown" | "not_found"

export type CrawlLog = {
  id: string
  sourceId: string
  startedAt: string
  finishedAt: string
  httpStatus?: number
  newCount: number
  changedCount: number
  errorCount: number
  errors: string[]
  robotsVerdict: RobotsVerdict
  method: MonitoringMethod
  durationMs: number
}
