import * as cheerio from "cheerio"
import type { Source } from "../types"
import type { FetchResult } from "./types"

const UA = "Mozilla/5.0 (compatible; DropwireSourceWatch/1.0; +https://dropx3.com)"

/** アイコン/ロゴ/トラッキングピクセル等、商品画像ではないと機械的に判定できるものだけ緩く除外する */
const NOISE_URL_PATTERN = /\b(icon|favicon|logo|sprite|pixel|tracking|avatar|spinner|loading)\b/i

function resolveImageUrl(src: string | undefined, pageUrl: string): string | null {
  if (!src || src.startsWith("data:")) return null
  try {
    const abs = new URL(src, pageUrl)
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return null
    return abs.toString()
  } catch {
    return null
  }
}

/**
 * HTMLから画像候補を機械的に集める。以前はプレーンテキスト化した本文をAIに渡し「本文中の画像URLを
 * 探させて」いたが、画像URLは通常<img>のsrc属性でありプレーンテキストの本文には現れないため
 * 原理的にほとんど機能しなかった(2026-08-21に発覚、SOURCE WATCH 483件中477件で画像候補0件だった
 * 不具合の根本原因)。og:image/twitter:imageメタタグと、本文らしき領域の<img>から直接拾う方式に変更。
 */
export function extractImageCandidatesFromHtml($: ReturnType<typeof cheerio.load>, pageUrl: string): string[] {
  const urls: string[] = []
  const seen = new Set<string>()

  const add = (src: string | undefined) => {
    const resolved = resolveImageUrl(src, pageUrl)
    if (!resolved || seen.has(resolved) || NOISE_URL_PATTERN.test(resolved)) return
    seen.add(resolved)
    urls.push(resolved)
  }

  add($('meta[property="og:image"]').attr("content"))
  add($('meta[name="twitter:image"]').attr("content"))

  $("article img, main img, .entry-content img, .post-content img, .content img")
    .slice(0, 10)
    .each((_, el) => add($(el).attr("src") || $(el).attr("data-src")))

  return urls.slice(0, 8)
}

/**
 * 汎用HTML取得。サイトごとのセレクタ調整はせず、本文らしきリンクをベストエフォートで抽出する
 * (専用パーサーが無いソース向けのフォールバック。運用しながら精度を上げる想定)。
 */
export async function fetchHtmlListing(source: Source): Promise<FetchResult> {
  const url = source.feedUrl ?? source.url
  if (!url) return { items: [], errors: ["urlが未設定"] }

  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) })
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

/** 新着URLの本文テキストを取得する(タイトルしか分からないsitemap方式の補完、画像候補の収集にも使う) */
export async function fetchPageText(url: string): Promise<{ title?: string; text?: string; imageCandidates: string[] } | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const html = await res.text()
    const $ = cheerio.load(html)
    const title = $("title").first().text().trim() || $("h1").first().text().trim()
    const imageCandidates = extractImageCandidatesFromHtml($, url)
    $("script, style, nav, footer, header").remove()
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 4000)
    return { title: title || undefined, text: text || undefined, imageCandidates }
  } catch {
    return null
  }
}
