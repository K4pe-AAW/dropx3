import { buildMercariSearchLink } from "@/lib/affiliate"
import type { PurchaseLinkCandidate, PurchaseLinkKind } from "./types"

/**
 * ブランドTOP(トップページ)しか無いかを判定する。パスがほぼ空("/"や1階層のみ)なら
 * 個別商品ページではないと見なす。ユーザー指定ルール:「ブランドTOPしか存在しない場合、
 * 『購入する』と表示しない。『公式サイトを見る』にする」。
 */
export function isBrandTopUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const segments = u.pathname.split("/").filter(Boolean)
    return segments.length === 0 || (segments.length === 1 && !u.search)
  } catch {
    return true
  }
}

const KIND_PRIORITY: Record<PurchaseLinkKind, number> = {
  official_product: 1,
  domestic_retailer: 2,
  official_lottery: 3,
  domestic_ec: 4,
  search: 5,
  brand_top: 6,
}

export function sortPurchaseLinkCandidates(candidates: PurchaseLinkCandidate[]): PurchaseLinkCandidate[] {
  return [...candidates].sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind])
}

export function makeCandidate(url: string, kind: PurchaseLinkKind, label?: string): PurchaseLinkCandidate {
  const isBrandTopOnly = kind === "brand_top" || isBrandTopUrl(url)
  return {
    url,
    kind: isBrandTopOnly ? "brand_top" : kind,
    isBrandTopOnly,
    label: label ?? (isBrandTopOnly ? "公式サイトを見る" : "購入する"),
  }
}

/**
 * 商品名+型番が両方揃っている場合のみメルカリ検索リンクを作る
 * (lib/affiliate.tsのbuildMercariSearchLinkはカテゴリ名単体などの汎用語を拒否する仕組みを持つ)。
 */
export function buildSearchFallback(brand: string | null, productName: string | null, styleCode: string | null): PurchaseLinkCandidate | null {
  const query = [brand, productName, styleCode].filter(Boolean).join(" ").trim()
  if (!query) return null
  try {
    const link = buildMercariSearchLink(query)
    return { url: link.url, kind: "search", isBrandTopOnly: false, label: link.label }
  } catch {
    return null
  }
}
