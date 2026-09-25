type AudienceText = {
  title?: string
  excerpt?: string
  bodyParagraphs?: string[]
  tags?: string[]
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
