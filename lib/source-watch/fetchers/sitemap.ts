import * as cheerio from "cheerio"
import { gunzipSync } from "node:zlib"
import type { Source } from "../types"
import type { FetchResult } from "./types"

const UA = "Mozilla/5.0 (compatible; DropwireSourceWatch/1.0; +https://dropx3.com)"
const MAX_CHILD_SITEMAPS = 2
const MAX_URLS_PER_SITEMAP = 50

/** Grailed等、sitemapがgzip圧縮(.xml.gz)で配信されているサイトに対応する */
async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Encoding": "identity" },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const isGzip = url.endsWith(".gz") || (res.headers.get("content-type") ?? "").includes("gzip")
  if (!isGzip) return res.text()
  const buf = Buffer.from(await res.arrayBuffer())
  return gunzipSync(buf).toString("utf-8")
}

/**
 * WordPress(Yoast)やShopifyのsitemap.xmlは大抵「子sitemapへのインデックス」であり、
 * 実際の記事/商品URLは1階層下にある。<sitemapindex>ならインデックス、<urlset>なら直接URL一覧として扱う。
 */
export async function fetchSitemap(source: Source): Promise<FetchResult> {
  const feedUrl = source.feedUrl ?? source.url
  if (!feedUrl) return { items: [], errors: ["feedUrl/urlが未設定"] }

  try {
    const rootXml = await fetchXml(feedUrl)
    const $root = cheerio.load(rootXml, { xmlMode: true })

    const isIndex = $root("sitemapindex").length > 0
    const urls: { loc: string; lastmod?: string }[] = []

    if (isIndex) {
      const childUrls = $root("sitemap > loc")
        .map((_, el) => $root(el).text().trim())
        .get()
        .slice(0, MAX_CHILD_SITEMAPS)

      for (const childUrl of childUrls) {
        try {
          const childXml = await fetchXml(childUrl)
          const $child = cheerio.load(childXml, { xmlMode: true })
          $child("url").each((_, el) => {
            const loc = $child(el).find("loc").first().text().trim()
            const lastmod = $child(el).find("lastmod").first().text().trim() || undefined
            if (loc) urls.push({ loc, lastmod })
          })
        } catch {
          // 子sitemap1件の失敗で全体を止めない
        }
      }
    } else {
      $root("url").each((_, el) => {
        const loc = $root(el).find("loc").first().text().trim()
        const lastmod = $root(el).find("lastmod").first().text().trim() || undefined
        if (loc) urls.push({ loc, lastmod })
      })
    }

    const items = urls.slice(0, MAX_URLS_PER_SITEMAP * MAX_CHILD_SITEMAPS).map((u) => ({
      url: u.loc,
      title: "", // sitemapにはタイトルが無い。crawl.ts側でHTML取得 or URLベースの仮タイトルを補う
      publishedAt: u.lastmod,
    }))

    return { items, errors: [], httpStatus: 200 }
  } catch (err) {
    return { items: [], errors: [err instanceof Error ? err.message : String(err)] }
  }
}
