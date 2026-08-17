import type { ProductCard } from "@/lib/source-watch/present"
import type { ConfidenceTier } from "@/lib/source-watch/types"

// フィルタ/集計ロジックを1箇所に集約する。SummaryBarの件数集計とFilterBar/Dashboardの絞り込みで
// 同じ判定条件を使い回すため(数え方と絞り込み方がズレると「クリックした数字と違う件数が出る」事故になる)。

export type Tab = "all" | "READY" | "REVIEW" | "HOLD"

export type QuickFilterKey =
  | "noImage"
  | "imageReview"
  | "domesticYes"
  | "domesticNo"
  | "noPurchaseLink"
  | "officialConfirmed"
  | "addedToday"

export function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

export const QUICK_FILTER_PREDICATES: Record<QuickFilterKey, (card: ProductCard) => boolean> = {
  noImage: (c) => c.imageStatus.level === "none",
  imageReview: (c) => c.imageStatus.level === "review",
  domesticYes: (c) => c.product.domesticConfirmed,
  domesticNo: (c) => !c.product.domesticConfirmed,
  noPurchaseLink: (c) => !c.hasNonBrandTopPurchaseLink,
  officialConfirmed: (c) => c.product.officialConfirmed,
  addedToday: (c) => isToday(c.product.firstDetectedAt),
}

export const QUICK_FILTER_LABEL: Record<QuickFilterKey, string> = {
  noImage: "画像なし",
  imageReview: "画像確認必要",
  domesticYes: "国内販売あり",
  domesticNo: "国内販売未確認",
  noPurchaseLink: "購入リンクなし",
  officialConfirmed: "記事化できる(公式確認済)",
  addedToday: "今日追加",
}

export type AdvancedFilters = { tier: ConfidenceTier | ""; brand: string; source: string; minScore: string }
export const EMPTY_ADVANCED: AdvancedFilters = { tier: "", brand: "", source: "", minScore: "" }

export function applyTab(cards: ProductCard[], tab: Tab): ProductCard[] {
  if (tab === "all") return cards
  return cards.filter((c) => c.product.readiness === tab)
}

export function applyQuickFilters(cards: ProductCard[], active: Set<QuickFilterKey>): ProductCard[] {
  if (active.size === 0) return cards
  return cards.filter((c) => [...active].every((key) => QUICK_FILTER_PREDICATES[key](c)))
}

export function applyAdvancedFilters(cards: ProductCard[], f: AdvancedFilters): ProductCard[] {
  let out = cards
  if (f.tier) out = out.filter((c) => c.product.tier === f.tier)
  if (f.brand) out = out.filter((c) => c.product.brand?.toLowerCase() === f.brand.toLowerCase())
  if (f.source) out = out.filter((c) => c.sourceNames.includes(f.source))
  if (f.minScore) out = out.filter((c) => c.product.sourceScore >= Number(f.minScore))
  return out
}
