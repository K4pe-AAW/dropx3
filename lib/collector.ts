import Parser from "rss-parser"
import { SOURCES, YOUTUBE_SOURCES, PR_TIMES_RSS_URL, PR_TIMES_KEYWORDS } from "./sources"
import { RawItem } from "./types"
import { generateId } from "./storage"

/**
 * customFields.item: YouTubeのチャンネルフィードはAtom+media namespaceで、動画の説明文が
 * <media:group><media:description>に入っている(標準のcontentSnippetにはマッピングされない)。
 * 他ソースのRSS 2.0フィードには存在しないフィールドなので、無い場合はundefinedのまま無害。
 */
const parser = new Parser<Record<string, never>, { mediaGroup?: { "media:description"?: string[] } }>({
  timeout: 15000,
  customFields: { item: [["media:group", "mediaGroup", { keepArray: false }]] },
})

type FeedItem = {
  title?: string
  link?: string
  contentSnippet?: string
  isoDate?: string
  pubDate?: string
  mediaGroup?: { "media:description"?: string[] }
}

/** ショート動画は短尺で情報量が薄く記事化に向かないため収集対象から除外する */
function isYoutubeShorts(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith("/shorts/")
  } catch {
    return false
  }
}

function toRawItem(sourceName: string, item: FeedItem): RawItem | null {
  if (!item.title || !item.link) return null
  if (isYoutubeShorts(item.link)) return null
  const snippet = item.contentSnippet || item.mediaGroup?.["media:description"]?.[0]
  return {
    id: generateId(item.link),
    sourceName,
    sourceUrl: item.link,
    title: item.title.trim(),
    snippet: snippet?.slice(0, 300),
    publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
  }
}

export async function collectFromRss(): Promise<{ items: RawItem[]; errors: string[] }> {
  const items: RawItem[] = []
  const errors: string[] = []

  for (const source of [...SOURCES, ...YOUTUBE_SOURCES]) {
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
