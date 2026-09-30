import { isMensLedDomesticBrandContent } from "./domestic-brands"

type AudienceText = {
  title?: string
  excerpt?: string
  bodyParagraphs?: string[]
  tags?: string[]
  brands?: string[]
}

const WOMEN_ONLY_KEYWORDS = [
  "ウィメンズ",
  "ウイメンズ",
  "レディース",
  "女性向け",
  "女性用",
  "女子向け",
  "ガールズ",
] as const

const WOMEN_ONLY_LATIN_PATTERNS = [
  /\bwomen(?:'s|s)?\b/i,
  /\bladies(?:'|')?\b/i,
  /\bgirls?(?:'|')?\b/i,
] as const

const MENS_OR_UNISEX_KEYWORDS = [
  "メンズ",
  "男性向け",
  "男性用",
  "紳士",
  "ユニセックス",
  "男女兼用",
] as const

const MENS_OR_UNISEX_LATIN_PATTERNS = [
  /\bmen(?:'s|s)?\b/i,
  /\bunisex\b/i,
] as const

/**
 * ブランドの印象ではなく、下書きに女性向けであることが明記された場合だけ判定する。
 * ユニセックスや男女展開の記事を誤って女性単独扱いにしないため、明示語がない候補はfalse。
 */
export function isWomenFocusedDraft(draft: AudienceText): boolean {
  const text = [
    draft.title ?? "",
    draft.excerpt ?? "",
    ...(draft.bodyParagraphs ?? []),
    ...(draft.tags ?? []),
  ].join(" ")

  return WOMEN_ONLY_KEYWORDS.some((keyword) => text.includes(keyword))
    || WOMEN_ONLY_LATIN_PATTERNS.some((pattern) => pattern.test(text))
}

/**
 * Xのメンズ枠へ入れてよい記事を保守的に判定する。
 * 女性向けの明示があれば除外し、メンズ／ユニセックスの明示、メンズSEOタグ、
 * または男女を限定しないスニーカー・ブーツ記事だけを対象にする。
 */
export function isMensOrUnisexDraft(draft: AudienceText & { category?: string }): boolean {
  if (isWomenFocusedDraft(draft)) return false
  const text = [
    draft.title ?? "",
    draft.excerpt ?? "",
    ...(draft.bodyParagraphs ?? []),
    ...(draft.tags ?? []),
  ].join(" ")
  return draft.tags?.includes("mens-fashion") === true
    || isMensLedDomesticBrandContent(draft)
    || MENS_OR_UNISEX_KEYWORDS.some((keyword) => text.includes(keyword))
    || MENS_OR_UNISEX_LATIN_PATTERNS.some((pattern) => pattern.test(text))
    || draft.category === "sneaker"
    || draft.category === "boots"
}
