// 管理画面(SOURCE WATCH編集デスク)向けの表示ラベル/バケット分類を1箇所に集約する。
// サーバー・クライアント両方から安全にimportできる純粋な定数のみを置く。

import type { ImageSourceType, PurchaseLinkKind, SourceCategory } from "./types"

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
