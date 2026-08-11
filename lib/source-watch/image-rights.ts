import type { ImageAsset, ImageRightsStatus, ImageSourceType } from "./types"

/** 記事に自動で使ってよい(=人間の追加確認なしで表示してよい)rightsStatus */
const AUTO_USABLE: ImageRightsStatus[] = ["approved", "permission_received", "terms_confirmed"]

/**
 * third_party_media(海外メディア/リーカー等が撮影・保有する画像)は原則 review_required または
 * prohibited 以外を許さない。誤ってapproved等にされていても、sourceTypeがthird_party_mediaなら
 * 自動使用は拒否する(二重チェック)。
 */
export function isImageAutoUsable(asset: Pick<ImageAsset, "sourceType" | "rightsStatus">): boolean {
  if (asset.sourceType === "third_party_media") return false
  if (asset.rightsStatus === "prohibited" || asset.rightsStatus === "review_required") return false
  return AUTO_USABLE.includes(asset.rightsStatus)
}

export function isEmbedOnly(asset: Pick<ImageAsset, "rightsStatus">): boolean {
  return asset.rightsStatus === "embed_only"
}

export type ImageStatusLevel = "usable" | "embed_only" | "review" | "unusable"

/**
 * 管理画面が人間向けに表示する4状態(✓使用可能/Embedのみ/△確認必要/×使用不可)への変換。
 * isImageAutoUsableと矛盾しないよう、usable判定はisImageAutoUsableへ委譲する(判定ロジックの二重管理を避ける)。
 */
export function imageStatusOf(asset: Pick<ImageAsset, "sourceType" | "rightsStatus">): ImageStatusLevel {
  if (isImageAutoUsable(asset)) return "usable"
  if (asset.rightsStatus === "prohibited") return "unusable"
  if (asset.rightsStatus === "embed_only") return "embed_only"
  return "review"
}

/** third_party_mediaは新規登録時、明示的な確認が入るまでreview_requiredより緩いステータスにしない */
export function defaultRightsStatusFor(sourceType: ImageSourceType): ImageRightsStatus {
  if (sourceType === "third_party_media") return "review_required"
  if (sourceType === "editorial_placeholder") return "approved" // 自前生成のグラフィックなので権利問題が起きない
  if (sourceType === "official_social") return "embed_only"
  return "review_required"
}

/**
 * 公式ページのHTML内でプレス素材/Media Kitへの導線を示す文字列を検出する。
 * 見つかったからといって即使用可にはしない(利用規約URLの保存が目的 — 権利判定は人間が行う)。
 */
const PRESS_ASSET_KEYWORDS = [
  "Download Images",
  "Download Assets",
  "Media Assets",
  "Press Images",
  "Press Kit",
  "Media Kit",
  "Press Downloads",
  "Editorial Images",
  "Media Download",
  "High Resolution",
  "Hi-Res",
]

const RIGHTS_KEYWORDS = ["Terms", "Usage Rights", "Editorial Use", "Media Use", "利用規約", "使用条件"]

export type DetectedLink = { text: string; href: string }

/** cheerioのCheerioAPIを直接importせず引数で受け取る(fetchers/html.tsで既にparse済みのものを渡す想定) */
export function detectPressAssetLinks(
  anchors: { text: string; href: string }[]
): { pressAssetLinks: DetectedLink[]; rightsLinks: DetectedLink[] } {
  const pressAssetLinks = anchors.filter((a) =>
    PRESS_ASSET_KEYWORDS.some((kw) => a.text.toLowerCase().includes(kw.toLowerCase()))
  )
  const rightsLinks = anchors.filter((a) =>
    RIGHTS_KEYWORDS.some((kw) => a.text.toLowerCase().includes(kw.toLowerCase()))
  )
  return { pressAssetLinks, rightsLinks }
}
