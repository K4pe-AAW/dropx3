import Parser from "rss-parser"
import { SOURCES, PR_TIMES_RSS_URL, PR_TIMES_KEYWORDS } from "./sources"
import { RawItem } from "./types"
import { generateId } from "./storage"

const parser = new Parser({ timeout: 15000 })

type FeedItem = {
  title?: string
  link?: string
  contentSnippet?: string
  isoDate?: string
  pubDate?: string
}

function toRawItem(sourceName: string, item: FeedItem): RawItem | null {
  if (!item.title || !item.link) return null
  return {
    id: generateId(item.link),
    sourceName,
    sourceUrl: item.link,
    title: item.title.trim(),
    snippet: item.contentSnippet?.slice(0, 300),
    publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
  }
}

export async function collectFromRss(): Promise<{ items: RawItem[]; errors: string[] }> {
  const items: RawItem[] = []
  const errors: string[] = []

  for (const source of SOURCES) {
    try {
      const feed = await parser.parseURL(source.rssUrl)
      for (const entry of feed.items.slice(0, 10)) {
        const raw = toRawItem(source.name, entry)
        if (raw) items.push(raw)
      }
    } catch (err) {
      errors.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  try {
    const feed = await parser.parseURL(PR_TIMES_RSS_URL)
    for (const entry of feed.items.slice(0, 40)) {
      const haystack = `${entry.title ?? ""} ${entry.contentSnippet ?? ""}`
      const matched = PR_TIMES_KEYWORDS.some((kw) => haystack.includes(kw))
      if (!matched) continue
      const raw = toRawItem("PR TIMES", entry)
      if (raw) items.push(raw)
    }
  } catch (err) {
    errors.push(`PR TIMES: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { items, errors }
}
