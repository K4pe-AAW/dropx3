import Parser from "rss-parser"
import * as cheerio from "cheerio"
import type { Source } from "../types"
import type { FetchResult } from "./types"
import { extractImageCandidatesFromHtml } from "./html"
import { FASHIONSNAP_INCLUDE_KEYWORDS, FASHIONSNAP_EXCLUDE_KEYWORDS } from "../../sources"

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
    const isFashionsnap = source.id === "domestic-fashionsnap"

    const items = feed.items
      .slice(0, needsKeywordFilter ? 60 : 20)
      .filter((entry) => {
        if (needsKeywordFilter) {
          const haystack = `${entry.title ?? ""} ${entry.contentSnippet ?? ""}`
          return PR_TIMES_KEYWORDS.some((kw) => haystack.includes(kw))
        }
        // FASHIONSNAPはメンズのアパレル系記事・ファッションイベント記事以外(レディース単独/美容/
        // 事件報道等)も無差別に配信しているため、lib/collector.ts(旧パイプライン)と同じ
        // include/excludeキーワードで絞り込む(除外語が優先)。定義はlib/sources.tsに集約。
        if (isFashionsnap) {
          const haystack = `${entry.title ?? ""} ${entry.contentSnippet ?? ""}`
          if (FASHIONSNAP_EXCLUDE_KEYWORDS.some((kw) => haystack.includes(kw))) return false
          return FASHIONSNAP_INCLUDE_KEYWORDS.some((kw) => haystack.includes(kw))
        }
        return true
      })
      .filter((entry) => entry.title && entry.link)
      .map((entry) => {
        const imageCandidates: string[] = []
        if (entry.enclosure?.url && entry.enclosure.type?.startsWith("image/")) {
          imageCandidates.push(entry.enclosure.url)
        }
        if (entry.content) {
          imageCandidates.push(...extractImageCandidatesFromHtml(cheerio.load(entry.content), entry.link as string))
        }
        return {
          url: entry.link as string,
          title: (entry.title as string).trim(),
          publishedAt: entry.isoDate || entry.pubDate,
          rawText: entry.contentSnippet?.slice(0, 2000) || entry.content?.slice(0, 2000),
          imageCandidates: [...new Set(imageCandidates)].slice(0, 8),
        }
      })

    return { items, errors: [], httpStatus: 200 }
  } catch (err) {
    return { items: [], errors: [err instanceof Error ? err.message : String(err)] }
  }
}
