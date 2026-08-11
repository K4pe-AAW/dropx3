import * as cheerio from "cheerio"
import type { Source } from "../types"
import type { FetchResult } from "./types"

const UA = "Mozilla/5.0 (compatible; DropwireSourceWatch/1.0; +https://dropx3.com)"

/**
 * 汎用HTML取得。サイトごとのセレクタ調整はせず、本文らしきリンクをベストエフォートで抽出する
 * (専用パーサーが無いソース向けのフォールバック。運用しながら精度を上げる想定)。
 */
export async function fetchHtmlListing(source: Source): Promise<FetchResult> {
  const url = source.feedUrl ?? source.url
  if (!url) return { items: [], errors: ["urlが未設定"] }

  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { items: [], errors: [`HTTP ${res.status}`], httpStatus: res.status }
    const html = await res.text()
    const $ = cheerio.load(html)
    const origin = new URL(url).origin

    const seen = new Set<string>()
    const items: FetchResult["items"] = []

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href")
      const text = $(el).text().trim()
      if (!href || !text || text.length < 8) return
      let abs: URL
      try {
        abs = new URL(href, origin)
      } catch {
        return
      }
      if (abs.origin !== origin) return
      const key = abs.toString()
      if (seen.has(key)) return
      seen.add(key)
      items.push({ url: key, title: text.slice(0, 200) })
    })

    return { items: items.slice(0, 60), errors: [], httpStatus: res.status }
  } catch (err) {
    return { items: [], errors: [err instanceof Error ? err.message : String(err)] }
  }
}

/** 新着URLの本文テキストを取得する(タイトルしか分からないsitemap方式の補完にも使う) */
export async function fetchPageText(url: string): Promise<{ title?: string; text?: string } | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const html = await res.text()
    const $ = cheerio.load(html)
    const title = $("title").first().text().trim() || $("h1").first().text().trim()
    $("script, style, nav, footer, header").remove()
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 4000)
    return { title: title || undefined, text: text || undefined }
  } catch {
    return null
  }
}
