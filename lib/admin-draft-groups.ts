import type { Category } from "./types"

/**
 * 管理画面の下書きレビュー専用のタブ分け。公開サイト側のCategory体系(lib/site-config.ts)は
 * そのまま維持しつつ、レビュー時の情報過多を解消するため既存カテゴリーを5タブに束ねるだけ。
 * どのgroupのcategoriesにも含めなければdraftGroupOfは自動で"other"に落ちる
 * (news/brandは意図的にこの扱い — 商品ではなく記事の切り口分類のため、accessory/figureと
 * 同じ「その他」タブでまとめてレビューする想定。専用タブが要る規模になったら別途検討)。
 */
export type DraftGroupKey = "apparel" | "shoes" | "other" | "vintage" | "youtube"

export const DRAFT_GROUPS: { key: DraftGroupKey; label: string; categories: Category[] }[] = [
  { key: "apparel", label: "アパレル", categories: ["tops", "pants", "jacket", "apparel"] },
  { key: "shoes", label: "靴", categories: ["boots", "sneaker"] },
  { key: "other", label: "その他", categories: ["accessory", "figure"] },
  { key: "vintage", label: "古着", categories: ["vintage"] },
  { key: "youtube", label: "Youtube", categories: ["youtube"] },
]

export function draftGroupOf(category: Category): DraftGroupKey {
  return DRAFT_GROUPS.find((g) => g.categories.includes(category))?.key ?? "other"
}
