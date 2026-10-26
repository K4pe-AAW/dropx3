import type { Article } from "./types"

export type ArticleAnswerFact = { label: string; value: string }

function uniqueFacts(facts: ArticleAnswerFact[]): ArticleAnswerFact[] {
  const seen = new Set<string>()
  return facts.filter((fact) => {
    const key = `${fact.label}:${fact.value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 記事内で確認済みの値だけを、検索・AI回答が拾いやすい短い要点へ整える。
 * 推測で価格や日付を補わず、構造化済みの値と本文の明示的な「未発表」だけを使う。
 */
export function articleAnswerFacts(article: Article): ArticleAnswerFact[] {
  const facts: ArticleAnswerFact[] = []
  const colorway = article.colorways?.find((item) =>
    Boolean(item.releaseDate || item.price || item.styleCode)
  )
  if (colorway?.releaseDate) facts.push({ label: "発売日", value: colorway.releaseDate })
  if (colorway?.price) facts.push({ label: "価格", value: colorway.price })
  if (colorway?.styleCode) facts.push({ label: "型番", value: colorway.styleCode })

  const text = [article.title, article.excerpt, ...article.bodyParagraphs].join("\n")
  const season = text.match(/20\d{2}年(?:春夏|秋冬)/)?.[0]
  if (!colorway?.releaseDate && season) facts.push({ label: "発売時期", value: season })

  const releaseUnannounced = /(?:具体的な[^。\n]{0,24})?発売日[^。\n]{0,35}(?:まだ|現時点で)[^。\n]{0,20}(?:未発表|発表されていません|明らかにされていません)/.test(text)
  const priceUnannounced = /(?:具体的な[^。\n]{0,24})?価格[^。\n]{0,35}(?:まだ|現時点で)[^。\n]{0,20}(?:未発表|発表されていません|明らかにされていません)/.test(text)
  if (!colorway?.releaseDate && releaseUnannounced) facts.push({ label: "具体的な発売日", value: "未発表" })
  if (!colorway?.price && priceUnannounced) facts.push({ label: "価格", value: "未発表" })

  return uniqueFacts(facts).slice(0, 4)
}
