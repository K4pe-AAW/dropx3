import Parser from "rss-parser"
import * as cheerio from "cheerio"
import {
  SOURCES,
  OFFICIAL_BRAND_LISTING_SOURCES,
  PR_TIMES_RSS_URL,
  PR_TIMES_KEYWORDS,
  FASHIONSNAP_INCLUDE_KEYWORDS,
  FASHIONSNAP_EXCLUDE_KEYWORDS,
} from "./sources"
import type { OfficialBrandListingSource } from "./sources"
import { RawItem } from "./types"
import { generateId, getCrawlSources } from "./storage"
import { youtubeChannelRssUrl } from "./source-watch/youtube"
import { isYoutubeVideoCollectable } from "./youtube-collection-policy"

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

const OFFICIAL_LISTING_UA = "Mozilla/5.0 (compatible; DropDropDropOfficialBrandWatch/1.0; +https://dropx3.com)"

function productTitleFromLink(text: string, pathname: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (cleaned.length >= 3) return cleaned.slice(0, 200)
  const slug = pathname.split("/").filter(Boolean).at(-1) ?? "新着商品"
  return decodeURIComponent(slug).replace(/[-_]+/g, " ").slice(0, 200)
}

/** 公式一覧HTMLから同一ドメインの商品URLだけを、画面上の並び順を保って抽出する。 */
export function extractOfficialBrandProductLinks(
  html: string,
  source: OfficialBrandListingSource
): { url: string; title: string }[] {
  const $ = cheerio.load(html)
  const listing = new URL(source.listingUrl)
  const seen = new Set<string>()
  const items: { url: string; title: string }[] = []

  $("a[href]").each((_, el) => {
    if (items.length >= source.maxItems) return
    const href = $(el).attr("href")
    if (!href) return
    let candidate: URL
    try {
      candidate = new URL(href, listing)
    } catch {
      return
    }
    if (candidate.origin !== listing.origin) return
    const markerIndex = candidate.pathname.indexOf(source.productPathMarker)
    if (markerIndex < 0) return

    // Shopifyの /collections/.../products/xxx は同じ商品の別名URLなので /products/xxx に正規化する。
    const canonicalPath = candidate.pathname.slice(markerIndex)
    candidate.pathname = canonicalPath
    candidate.search = ""
    candidate.hash = ""
    const url = candidate.toString()
    if (seen.has(url)) return
    seen.add(url)
    items.push({ url, title: productTitleFromLink($(el).text(), canonicalPath) })
  })
  return items
}

export async function collectFromOfficialBrandListings(): Promise<{ items: RawItem[]; errors: string[] }> {
  const items: RawItem[] = []
  const errors: string[] = []
  for (const source of OFFICIAL_BRAND_LISTING_SOURCES) {
    try {
      const res = await fetch(source.listingUrl, {
        headers: { "User-Agent": OFFICIAL_LISTING_UA },
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const fetchedAt = new Date().toISOString()
      for (const product of extractOfficialBrandProductLinks(await res.text(), source)) {
        items.push({
          id: generateId(product.url),
          sourceName: source.name,
          sourceUrl: product.url,
          title: product.title,
          publishedAt: fetchedAt,
          fetchedAt,
          officialBrand: source.brand,
        })
      }
    } catch (err) {
      errors.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { items, errors }
}

/** ショート動画は短尺で情報量が薄く記事化に向かないため収集対象から除外する */
function isYoutubeShorts(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith("/shorts/")
  } catch {
    return false
  }
}

/** FASHIONSNAPはメンズのアパレル系記事・ファッションイベント記事以外(レディース単独/美容/事件報道等)も
 *  無差別に配信しているため、タイトル・要約に対象語を含むものだけを通す(除外語が優先) */
function isFashionsnapAllowed(sourceName: string, item: FeedItem): boolean {
  if (sourceName !== "FASHIONSNAP") return true
  const haystack = `${item.title ?? ""} ${item.contentSnippet ?? item.content ?? ""}`
  if (FASHIONSNAP_EXCLUDE_KEYWORDS.some((kw) => haystack.includes(kw))) return false
  return FASHIONSNAP_INCLUDE_KEYWORDS.some((kw) => haystack.includes(kw))
}

/** RSSのcontent(WordPress系フィードのcontent:encoded)はHTMLタグ入りのため、AIに渡す前にタグを除去する */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function toRawItem(sourceName: string, item: FeedItem, youtubeChannelId?: string): RawItem | null {
  if (!item.title || !item.link) return null
  if (isYoutubeShorts(item.link)) return null
  if (!isFashionsnapAllowed(sourceName, item)) return null
  // content:encoded(本文全体)を優先する。WordPress系メディアの多くは記事末尾に「販売店舗・
  // オンラインリンク」のような取り扱い店舗一覧を含めており、contentSnippet(要約のみ)だと
  // ここが欠落してai-draft.tsが取り扱い店舗を拾えなくなるため
  const raw = item.content || item.contentSnippet || item.mediaGroup?.["media:description"]?.[0]
  const snippet = raw ? stripHtml(raw) : undefined
  if (!isYoutubeVideoCollectable(sourceName, item.title, snippet, youtubeChannelId)) return null
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
  const official = await collectFromOfficialBrandListings()
  const items: RawItem[] = [...official.items]
  const errors: string[] = [...official.errors]

  const { youtube } = await getCrawlSources()
  const youtubeSources = youtube.map((y) => ({
    name: y.name,
    rssUrl: youtubeChannelRssUrl(y.channelId),
    siteUrl: y.siteUrl,
    youtubeChannelId: y.channelId,
  }))

  for (const source of [...SOURCES, ...youtubeSources]) {
    try {
      const feed = await parser.parseURL(source.rssUrl)
      for (const entry of feed.items.slice(0, 10)) {
        const raw = toRawItem(
          source.name,
          entry,
          "youtubeChannelId" in source && typeof source.youtubeChannelId === "string"
            ? source.youtubeChannelId
            : undefined
        )
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
