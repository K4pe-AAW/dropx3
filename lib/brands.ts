/**
 * ブランド名の表記揺れを吸収する。実データ監査(2026-08-11)で Nike/NIKE/ナイキ、
 * Jordan/Air Jordan/Jordan Brand、Guidi/GUIDI 等の分裂が見つかったため導入。
 * 関連記事の絞り込みやブランド別ページの一覧が分裂しないよう、保存前に正規化して使う。
 */
const BRAND_ALIASES: Record<string, string> = {
  nike: "Nike",
  ナイキ: "Nike",
  jordan: "Jordan Brand",
  "air jordan": "Jordan Brand",
  "jordan brand": "Jordan Brand",
  アディダス: "adidas",
  guidi: "GUIDI",
}

export function canonicalBrandName(raw: string): string {
  const key = raw.trim().toLowerCase()
  return BRAND_ALIASES[key] ?? raw.trim()
}

export function canonicalBrandNames(raw: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const b of raw) {
    const canon = canonicalBrandName(b)
    if (!seen.has(canon)) {
      seen.add(canon)
      result.push(canon)
    }
  }
  return result
}
