import Parser from "rss-parser"
import type { Source } from "../types"
import type { FetchResult } from "./types"

const parser = new Parser({ timeout: 15000 })

/** PR TIMESのような全ジャンル配信ソースだけキーワード絞り込みを行う */
const PR_TIMES_KEYWORDS = [
  "スニーカー", "ファッション", "アパレル", "ストリートファッション", "セレクトショップ",
  "アパレルブランド", "ファッションブランド", "スニーカーコラボ", "アパレルコラボ", "ファッションコラボ",
  "秋冬コレクション", "春夏コレクション", "Nike", "adidas", "New Balance", "Supreme", "ZOZO", "ユニクロ", "UNIQLO",
]

export async function fetchRss(source: Source): Promise<FetchResult> {
  const feedUrl = source.feedUrl ?? source.url
  if (!feedUrl) return { items: [], errors: ["feedUrl/urlが未設定"] }

  try {
    const feed = await parser.parseURL(feedUrl)
    const needsKeywordFilter = source.id === "press-prtimes"

    const items = feed.items
      .slice(0, needsKeywordFilter ? 60 : 20)
      .filter((entry) => {
        if (!needsKeywordFilter) return true
        const haystack = `${entry.title ?? ""} ${entry.contentSnippet ?? ""}`
        return PR_TIMES_KEYWORDS.some((kw) => haystack.includes(kw))
      })
      .filter((entry) => entry.title && entry.link)
      .map((entry) => ({
        url: entry.link as string,
        title: (entry.title as string).trim(),
        publishedAt: entry.isoDate || entry.pubDate,
        rawText: entry.contentSnippet?.slice(0, 2000) || entry.content?.slice(0, 2000),
      }))

    return { items, errors: [], httpStatus: 200 }
  } catch (err) {
    return { items: [], errors: [err instanceof Error ? err.message : String(err)] }
  }
}
