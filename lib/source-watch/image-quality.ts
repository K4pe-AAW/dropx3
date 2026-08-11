import { imageStatusOf } from "./image-rights"
import type { ImageAsset, ImageSourceType } from "./types"

export type ImageQualityGrade = "A" | "B" | "C" | "D"

/** 長辺がこの値以上と判明していれば高解像度とみなす。判明していない場合は判定に使わない(捏造しない) */
const HIGH_RES_LONG_EDGE = 1600

const A_GRADE_SOURCES: ImageSourceType[] = ["official_press", "direct_press"]
const B_GRADE_SOURCES: ImageSourceType[] = ["affiliate_asset", "retailer", "official_store", "pr_service"]

function isKnownLowRes(asset: Pick<ImageAsset, "width" | "height">): boolean {
  const longEdge = Math.max(asset.width ?? 0, asset.height ?? 0)
  if (longEdge === 0) return false // 未取得の場合は「低解像度と判明」扱いにしない
  return longEdge < HIGH_RES_LONG_EDGE
}

/**
 * IMAGE QUALITY (A/B/C/D)。使用不可(unusable)の画像は評価対象外でnullを返す。
 * A: Official Press / High Resolution / Rights Confirmed
 * B: Affiliate Product Image / Rights Confirmed (or 解像度不明のOfficial Press)
 * C: Official Social Embed
 * D: Editorial Placeholder
 * まだRights未確認(review)の画像は、確定できないためnull(グレード欄には「確認待ち」と表示する想定)。
 */
export function gradeImageAsset(asset: ImageAsset): ImageQualityGrade | null {
  const status = imageStatusOf(asset)
  if (status === "unusable") return null
  if (asset.sourceType === "editorial_placeholder") return "D"
  if (status === "embed_only" || asset.sourceType === "official_social") return "C"
  if (status !== "usable") return null // review_required: 人間の判定待ちのためA〜Dを確定させない

  if (A_GRADE_SOURCES.includes(asset.sourceType)) {
    return isKnownLowRes(asset) ? "B" : "A"
  }
  if (B_GRADE_SOURCES.includes(asset.sourceType)) return "B"
  return "B" // usableだが想定外の組み合わせは安全側でB
}

/** 複数画像候補から「今選べる最良のグレード」を返す(A→B→C→Dの順で最初に見つかったもの) */
export function bestImageGrade(assets: ImageAsset[]): ImageQualityGrade | null {
  const grades = assets.map(gradeImageAsset).filter((g): g is ImageQualityGrade => g !== null)
  const order: ImageQualityGrade[] = ["A", "B", "C", "D"]
  return order.find((g) => grades.includes(g)) ?? null
}
