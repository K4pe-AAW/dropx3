import { canonicalBrandName } from "@/lib/brands"

/** 追跡用パラメータを除去してURLの実体で重複判定できるようにする */
const TRACKING_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "igshid"]

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    for (const p of TRACKING_PARAMS) u.searchParams.delete(p)
    u.hash = ""
    const path = u.pathname.replace(/\/+$/, "")
    return `${u.origin.toLowerCase()}${path}${u.search}`
  } catch {
    return url.trim()
  }
}

export function normalizeBrand(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null
  return canonicalBrandName(raw).toLowerCase()
}

/** 型番は表記の大文字小文字だけ揃える。ハイフンは商品によって意味を持つため削らない */
export function normalizeStyleCode(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null
  return raw.trim().toUpperCase().replace(/\s+/g, "")
}

export function normalizeModelName(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s\-_/×xX]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * 同一商品判定キー。型番がある場合は型番を最優先(ユーザー指定のルール)。
 * どちらも無ければnullを返し、呼び出し側は新規Productとして扱う(誤結合を避ける)。
 */
export function buildProductMatchKey(input: {
  styleCode: string | null
  brand: string | null
  modelName: string | null
}): { styleCode: string | null; normalizedBrand: string | null; normalizedModelName: string | null } {
  return {
    styleCode: normalizeStyleCode(input.styleCode),
    normalizedBrand: normalizeBrand(input.brand),
    normalizedModelName: normalizeModelName(input.modelName),
  }
}
