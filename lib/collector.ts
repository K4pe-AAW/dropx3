import Parser from "rss-parser"
import { SOURCES, PR_TIMES_RSS_URL, PR_TIMES_KEYWORDS, FASHIONSNAP_EXCLUDE_KEYWORDS } from "./sources"
import { RawItem } from "./types"
import { generateId, getCrawlSources } from "./storage"
import { youtubeChannelRssUrl } from "./source-watch/youtube"

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
  content?: string
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

/** FASHIONSNAPはコスメ/美容・事件報道等ストリートウェアと無関係なジャンルも配信しているため弾く */
function isFashionsnapExcluded(sourceName: string, item: FeedItem): boolean {
  if (sourceName !== "FASHIONSNAP") return false
  const haystack = `${item.title ?? ""} ${item.contentSnippet ?? item.content ?? ""}`
  return FASHIONSNAP_EXCLUDE_KEYWORDS.some((kw) => haystack.includes(kw))
}

/** RSSのcontent(WordPress系フィードのcontent:encoded)はHTMLタグ入りのため、AIに渡す前にタグを除去する */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function toRawItem(sourceName: string, item: FeedItem): RawItem | null {
  if (!item.title || !item.link) return null
  if (isYoutubeShorts(item.link)) return null
  if (isFashionsnapExcluded(sourceName, item)) return null
  // content:encoded(本文全体)を優先する。WordPress系メディアの多くは記事末尾に「販売店舗・
  // オンラインリンク」のような取り扱い店舗一覧を含めており、contentSnippet(要約のみ)だと
  // ここが欠落してai-draft.tsが取り扱い店舗を拾えなくなるため
  const raw = item.content || item.contentSnippet || item.mediaGroup?.["media:description"]?.[0]
  const snippet = raw ? stripHtml(raw) : undefined
  return {
    id: generateId(item.link),
    sourceName,
    sourceUrl: item.link,
    title: item.title.trim(),
    snippet: snippet?.slice(0, 3000),
    publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
  }
}

export async function collectFromRss(): Promise<{ items: RawItem[]; errors: string[] }> {
  const items: RawItem[] = []
  const errors: string[] = []

  const { youtube } = await getCrawlSources()
  const youtubeSources = youtube.map((y) => ({ name: y.name, rssUrl: youtubeChannelRssUrl(y.channelId), siteUrl: y.siteUrl }))

  for (const source of [...SOURCES, ...youtubeSources]) {
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
