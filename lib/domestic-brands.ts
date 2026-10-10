type BrandContent = {
  brands?: string[]
}

/**
 * DROPが継続的に追う国内デザイナーズ／メンズ軸のブランド。
 * LEMAIREは国内ブランドではないが、DROPの重点デザイナーズ枠として同じ優先配分へ含める。
 * 公式商品一覧から収集するブランドに加え、既存記事で同じ編集枠へ入れるブランドを含む。
 */
export const DOMESTIC_BRAND_NAMES = [
  "A.PRESSE",
  "AURALEE",
  "COMOLI",
  "LEMAIRE",
  "MARKAWARE",
  "MASU",
  "ssstein",
  "NICENESS",
  "KAPTAIN SUNSHINE",
  "CLESSTE",
  "ENNOY",
  "Graphpaper",
  "sacai",
  "YOKE",
] as const

const DOMESTIC_BRAND_KEYS = new Set(DOMESTIC_BRAND_NAMES.map((brand) => brand.toLowerCase()))

/** メンズ／ユニセックス中心と公式展開から確認できるブランドだけをXのメンズ枠に含める。 */
const MENS_LED_DOMESTIC_BRAND_KEYS = new Set([
  "a.presse",
  "auralee",
  "comoli",
  "lemaire",
  "markaware",
  "masu",
  "ssstein",
  "niceness",
  "kaptain sunshine",
  "clesste",
  "ennoy",
  "graphpaper",
  "sacai",
  "yoke",
])

export function isDomesticBrandContent(content: BrandContent): boolean {
  return (content.brands ?? []).some((brand) => DOMESTIC_BRAND_KEYS.has(brand.trim().toLowerCase()))
}

export function isMensLedDomesticBrandContent(content: BrandContent): boolean {
  return (content.brands ?? []).some((brand) => MENS_LED_DOMESTIC_BRAND_KEYS.has(brand.trim().toLowerCase()))
}
