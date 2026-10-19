import { isDomesticBrandContent } from "./domestic-brands"

type FashionContent = {
  brands?: string[]
  title?: string
  excerpt?: string
  bodyParagraphs?: string[]
  tags?: string[]
}

export type SocialFocusLane = "domestic" | "street" | "other"

const STREET_BRAND_KEYS = new Set([
  "a bathing ape",
  "adidas",
  "adidas originals",
  "asics",
  "carhartt wip",
  "converse",
  "fragment design",
  "hoka",
  "human made",
  "jordan brand",
  "kith",
  "neighborhood",
  "new balance",
  "nike",
  "noah",
  "palace skateboards",
  "salomon",
  "stussy",
  "supreme",
  "the north face",
  "vans",
  "wtaps",
])

const STREET_TERMS = [
  /(?:ストリート(?:ウェア|ブランド|ファッション)?|スケート(?:ボード|カルチャー)?)/i,
  /(?:スニーカー|SNKRS|ダンク|エア\s*ジョーダン|エア\s*マックス)/i,
]

export function isStreetBrandContent(content: FashionContent): boolean {
  if ((content.brands ?? []).some((brand) => STREET_BRAND_KEYS.has(brand.trim().toLowerCase()))) return true
  const text = [content.title, content.excerpt, ...(content.bodyParagraphs ?? []), ...(content.tags ?? [])]
    .filter(Boolean)
    .join(" ")
  return STREET_TERMS.some((pattern) => pattern.test(text))
}

export function socialFocusLane(content: FashionContent): SocialFocusLane {
  if (isDomesticBrandContent(content)) return "domestic"
  if (isStreetBrandContent(content)) return "street"
  return "other"
}
