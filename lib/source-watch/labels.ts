// 管理画面(SOURCE WATCH編集デスク)向けの表示ラベル/バケット分類を1箇所に集約する。
// サーバー・クライアント両方から安全にimportできる純粋な定数のみを置く。

import type { ImageSourceType, PurchaseLinkKind, SaleMethod, SocialPlatform, SocialPostType, SocialPriority, SocialSourceType, SourceCategory } from "./types"

export const SOURCE_CATEGORY_LABEL: Record<SourceCategory, string> = {
  official: "公式",
  press: "プレス",
  retailer: "販売店",
  early_media: "海外速報",
  domestic_media: "国内メディア",
  resale: "二次流通",
  social: "SNS",
}

export const SOURCE_CATEGORY_ORDER: SourceCategory[] = [
  "official",
  "press",
  "retailer",
  "early_media",
  "domestic_media",
  "resale",
  "social",
]

/** カード/Inspectorの「SOURCE」バッジ用。SOURCE_CATEGORY_LABELより短い英字表記 */
export const SOURCE_CATEGORY_SHORT_LABEL: Record<SourceCategory, string> = {
  official: "OFFICIAL",
  press: "PRESS",
  retailer: "RETAILER",
  early_media: "EARLY",
  domestic_media: "MEDIA",
  resale: "RESALE",
  social: "SOCIAL",
}

/** IMAGE FINDERのカテゴリタブ。editorial_placeholderは「候補」ではないため含めない */
export type ImageCategoryBucket = "official" | "press" | "affiliate" | "retailer" | "social" | "early"

export const IMAGE_CATEGORY_BUCKET: Record<Exclude<ImageSourceType, "editorial_placeholder">, ImageCategoryBucket> = {
  official_press: "official",
  official_store: "official",
  direct_press: "press",
  pr_service: "press",
  affiliate_asset: "affiliate",
  retailer: "retailer",
  official_social: "social",
  third_party_media: "early",
}

export const IMAGE_CATEGORY_BUCKET_LABEL: Record<ImageCategoryBucket, string> = {
  official: "OFFICIAL",
  press: "PRESS",
  affiliate: "AFFILIATE",
  retailer: "RETAILER",
  social: "SOCIAL",
  early: "EARLY MEDIA",
}

/** IMAGE FINDERの「画像URLを追加」フォーム用ラベル(editorial_placeholderは手動追加の対象外) */
export const IMAGE_SOURCE_TYPE_LABEL: Record<Exclude<ImageSourceType, "editorial_placeholder">, string> = {
  official_press: "公式プレス素材",
  official_store: "公式ストア画像",
  direct_press: "ブランド直プレス",
  pr_service: "PR代行・配信",
  affiliate_asset: "ASP提供画像",
  retailer: "販売店画像",
  official_social: "公式SNS埋め込み",
  third_party_media: "第三者メディア(海外メディア等)",
}

export const IMAGE_SOURCE_TYPES: Exclude<ImageSourceType, "editorial_placeholder">[] = [
  "official_press",
  "official_store",
  "direct_press",
  "pr_service",
  "affiliate_asset",
  "retailer",
  "official_social",
  "third_party_media",
]

export const PURCHASE_LINK_KIND_LABEL: Record<PurchaseLinkKind, string> = {
  official_product: "公式・購入ページ",
  official_lottery: "公式・抽選応募",
  domestic_retailer: "販売店・購入ページ",
  domestic_ec: "ECサイト・購入ページ",
  search: "検索リンク",
  brand_top: "公式サイト(TOP)",
}

// --- SOCIAL WATCH ---

export const SOCIAL_PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  x: "X",
  threads: "Threads",
  youtube: "YouTube",
  tiktok: "TikTok",
}

export const SOCIAL_SOURCE_TYPE_LABEL: Record<SocialSourceType, string> = {
  official_brand: "公式ブランド",
  official_artist: "公式アーティスト",
  official_event: "公式イベント",
  official_store: "公式販売店",
  media: "メディア",
  collector: "コレクター",
  unknown: "不明",
}

export const SOCIAL_SOURCE_TYPE_SHORT_LABEL: Record<SocialSourceType, string> = {
  official_brand: "OFFICIAL BRAND",
  official_artist: "OFFICIAL ARTIST",
  official_event: "OFFICIAL EVENT",
  official_store: "OFFICIAL STORE",
  media: "MEDIA",
  collector: "COLLECTOR",
  unknown: "UNKNOWN",
}

export const SOCIAL_PRIORITY_ORDER: SocialPriority[] = ["S", "A", "B", "C"]

export const SALE_METHOD_LABEL: Record<SaleMethod, string> = {
  general: "一般販売",
  first_come: "先着",
  lottery: "抽選",
  web_lottery: "WEB抽選",
  store_lottery: "店頭抽選",
  entry_lottery: "入場抽選",
  made_to_order: "受注",
  preorder: "予約",
  event_limited: "イベント限定",
  online_limited: "オンライン限定",
  venue_limited: "会場限定",
}

export const SALE_METHODS: SaleMethod[] = [
  "general",
  "first_come",
  "lottery",
  "web_lottery",
  "store_lottery",
  "entry_lottery",
  "made_to_order",
  "preorder",
  "event_limited",
  "online_limited",
  "venue_limited",
]

/** 抽選/締切系ほど優先度を上げる対象(SmartQueue的な並び替えで使う) */
export const LOTTERY_LIKE_SALE_METHODS: SaleMethod[] = ["lottery", "web_lottery", "store_lottery", "entry_lottery"]

export const SOCIAL_POST_TYPE_LABEL: Record<SocialPostType, string> = {
  raffle: "抽選",
  release: "発売",
  restock: "再販",
  preorder: "予約",
  made_to_order: "受注",
  event: "イベント",
  popup: "POP UP",
  collab: "コラボ",
  teaser: "予告",
  sold_out: "完売",
  result: "抽選結果",
  other: "その他",
}

export const SOCIAL_POST_TYPES: SocialPostType[] = [
  "raffle",
  "release",
  "restock",
  "preorder",
  "made_to_order",
  "event",
  "popup",
  "collab",
  "teaser",
  "sold_out",
  "result",
  "other",
]

export const SOCIAL_TOPICS = ["SOFUBI", "ART_TOY", "FIGURE", "FASHION", "SNEAKER", "EVENT"] as const
export type SocialTopic = (typeof SOCIAL_TOPICS)[number]
export const SOCIAL_TOPIC_LABEL: Record<SocialTopic, string> = {
  SOFUBI: "ソフビ",
  ART_TOY: "アートトイ",
  FIGURE: "フィギュア",
  FASHION: "ファッション",
  SNEAKER: "スニーカー",
  EVENT: "イベント",
}
