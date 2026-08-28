import * as cheerio from "cheerio"
import type { Source } from "../types"
import type { FetchResult } from "./types"
import { prioritizeProductFacts } from "@/lib/product-fact-evidence"
import { canonicalImageKey, deduplicateImageUrls } from "@/lib/image-candidates"

const UA = "Mozilla/5.0 (compatible; DropwireSourceWatch/1.0; +https://dropx3.com)"

/** アイコン/ロゴ/トラッキングピクセル等、商品画像ではないと機械的に判定できるものだけ緩く除外する */
const NOISE_URL_PATTERN = /\b(icon|favicon|logo|sprite|pixel|tracking|avatar|spinner|loading)\b/i
const COMMERCE_LINK_PATTERN =
  /(抽選|応募|エントリー|購入|販売|予約|オンラインストア|公式(?:サイト|ストア)|商品ページ|取扱|取り扱い|shop|store|buy|purchase|raffle|lottery|entry|release)/i

/**
 * Content-Typeヘッダー、無ければHTML先頭のmeta charsetから文字コードを検出し、TextDecoderが
 * 認識できるラベルに正規化する。楽天市場の商品ページ等、今もEUC-JP/Shift_JISで配信している
 * 国内ECサイトへの対応(fetch().text()は常にUTF-8として復号するため、それらのサイトは文字化けし
 * 記事取得が事実上失敗していた——2026-08-22に発覚)。検出できない/TextDecoder未対応のラベルは
 * undefinedを返しUTF-8のまま扱う(現状維持、安全側に倒す)。
 */
function detectCharset(contentTypeHeader: string | null, headBytes: Uint8Array): string | undefined {
  const fromHeader = contentTypeHeader?.match(/charset=["']?([\w-]+)/i)?.[1]
  // charset宣言はASCII範囲の文字列なので、本文が非UTF-8でもlatin1(1バイト=1コードポイント)なら
  // 文字化けせずこの部分だけ正しく読める
  const headText = Buffer.from(headBytes).toString("latin1")
  const fromMeta =
    headText.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
    headText.match(/<meta[^>]+content=["'][^"']*charset=([\w-]+)/i)?.[1]
  const raw = (fromHeader ?? fromMeta)?.toLowerCase()
  if (!raw || raw === "utf-8" || raw === "utf8") return undefined
  try {
    new TextDecoder(raw)
    return raw
  } catch {
    return undefined
  }
}

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
    if (!resolved || NOISE_URL_PATTERN.test(resolved)) return
    const key = canonicalImageKey(resolved)
    if (seen.has(key)) return
    seen.add(key)
    urls.push(resolved)
  }

  const addSrcset = (srcset: string | undefined) => {
    if (!srcset) return
    // srcsetは通常、小→大の順。最大候補を先に採用し、サムネイルだけを拾うのを避ける。
    const candidates = srcset
      .split(",")
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean)
    add(candidates.at(-1))
  }

  const addElement = (el: cheerio.Element) => {
    const node = $(el)
    const width = Number(node.attr("width") || 0)
    const height = Number(node.attr("height") || 0)
    if ((width > 0 && width <= 64) || (height > 0 && height <= 64)) return
    addSrcset(node.attr("data-srcset") || node.attr("srcset"))
    add(node.attr("data-original") || node.attr("data-lazy-src") || node.attr("data-src") || node.attr("src"))
  }

  $('meta[property="og:image"], meta[property="og:image:url"], meta[name="twitter:image"], meta[name="twitter:image:src"]')
    .each((_, el) => add($(el).attr("content")))

  $("article img, article source, main img, main source, .entry-content img, .entry-content source, .post-content img, .post-content source, .content img, .content source")
    .slice(0, 30)
    .each((_, el) => addElement(el))

  /**
   * 楽天市場の商品ページ等、<article>/<main>のような意味づけを持たない古い形式のページでは
   * 上のセレクタが何もヒットせずog:image1枚しか拾えない(実際は同じ商品の別カットが多数
   * 掲載されているのに)。og:imageが見つかっていれば、その画像と同じフォルダに置かれた画像は
   * 同一商品の別カットである可能性が高いという経験則で追加収集する(ページ内の「おすすめ商品」
   * 等は別フォルダに置かれることが多く、意図せず混入しにくい)。パス(ホスト名を除く)で比較する
   * ——楽天は同じ画像を`shop.r10s.jp`と`image.rakuten.co.jp`等、複数ホスト名で配信するため。
   * フォルダの階層が浅い(例: "/images/")場合は無関係画像まで拾ってしまうため対象外とする。
   * og:image自体が見つからないページでは実行しない。
   */
  if (urls.length > 0) {
    const primaryPath = (() => {
      try {
        return new URL(urls[0]).pathname
      } catch {
        return ""
      }
    })()
    const primaryDir = primaryPath.slice(0, primaryPath.lastIndexOf("/") + 1)
    const isSpecificEnough = primaryDir.split("/").filter(Boolean).length >= 3
    if (isSpecificEnough) {
      $("img")
        .slice(0, 100)
        .each((_, el) => {
          const src = $(el).attr("data-original") || $(el).attr("data-lazy-src") || $(el).attr("data-src") || $(el).attr("src")
          const resolved = resolveImageUrl(src, pageUrl)
          if (!resolved) return
          let path: string
          try {
            path = new URL(resolved).pathname
          } catch {
            return
          }
          if (path.startsWith(primaryDir)) addElement(el)
        })
    }
  }

  return deduplicateImageUrls(urls, 12)
}

/** 販売先・抽選応募先として人間に提示する価値があるリンクだけを元HTMLからURL付きで拾う。 */
export function extractCommerceLinkCandidatesFromHtml(
  $: ReturnType<typeof cheerio.load>,
  pageUrl: string
): { label: string; url: string }[] {
  const found: { label: string; url: string }[] = []
  const seen = new Set<string>()
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim()
    const label = $(el).text().replace(/\s+/g, " ").trim()
    const context = `${label} ${href ?? ""}`
    if (!href || !COMMERCE_LINK_PATTERN.test(context)) return
    let url: string
    try {
      const parsed = new URL(href, pageUrl)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return
      parsed.hash = ""
      url = parsed.toString()
    } catch {
      return
    }
    if (seen.has(url)) return
    seen.add(url)
    found.push({ label: label.slice(0, 100) || new URL(url).hostname, url })
  })
  return found.slice(0, 30)
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

export type PageTextResult = {
  title?: string
  text?: string
  imageCandidates: string[]
  commerceLinkCandidates?: { label: string; url: string }[]
  /**
   * 取得自体が失敗した理由(人間の編集者にそのまま見せられる短い日本語の説明)。BEAMS等、
   * ボット対策と見られる無応答(タイムアウト)でVercel本番からも到達不能なサイトが実際にあった
   * (2026-08-22に発覚)。取得できたが本文が空、のようなケースとは区別できるようにする。
   */
  failureReason?: string
}

/**
 * 本文らしき領域のテキストを取得する。article/main等の意味づけがあればそこだけを使い、
 * ECサイトのメガメニュー等のノイズを避ける(extractImageCandidatesFromHtmlと同じ考え方)。
 * 領域が無い/短すぎる(=本文コンテナとして機能していない)場合はbody全体にフォールバックする
 * (古い形式のページ向け)。
 */
function extractBodyText($: ReturnType<typeof cheerio.load>): string {
  for (const sel of ["article", "main", ".entry-content", ".post-content", ".content"]) {
    const text = $(sel).first().text().replace(/\s+/g, " ").trim()
    if (text.length > 200) return text
  }
  return $("body").text().replace(/\s+/g, " ").trim()
}

/**
 * 本文として渡すテキストの上限文字数。ナビゲーション/メガメニューが長いECサイト(例:
 * ABC-MARTの商品ページで実測、価格等の情報が7,900文字目以降にしか出てこなかった)では
 * 以前の上限(4000)だと本文の大半を切り捨てており、「価格や発売日はまだ発表されていません」と
 * 書かれがちだった原因の一つと判明した(2026-08-22)。gpt-4o-miniの入力コストは軽微なため、
 * 安全側に大きめの上限に引き上げる。
 */
export const BODY_TEXT_LIMIT = 12000

/**
 * 新着URLの本文テキストを取得する(タイトルしか分からないsitemap方式の補完、画像候補の収集にも使う)。
 * 楽天市場等、応答が遅いサイトが実際にあった(実測10秒超)ため、fetchHtmlListing(巡回の一覧取得、
 * SOURCE WATCHのcron時間予算が厳しい)より長めのタイムアウトを持たせている。
 */
export async function fetchPageText(url: string): Promise<PageTextResult> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return { imageCandidates: [], failureReason: `サイトがエラーを返しました(HTTP ${res.status})` }
    const buf = new Uint8Array(await res.arrayBuffer())
    // AWS WAF Bot Control等のチャレンジ応答は2xx(ok)のまま本文0バイトで返ってくることがある
    // (arknets.co.jpで実際に確認、x-amzn-waf-action: challenge)。res.okだけでは成功と誤認するため
    // 空応答を明示的に区別し、「パースに失敗した」ではなく正しい理由をfailureReasonに残す。
    if (buf.length === 0) {
      return {
        imageCandidates: [],
        failureReason: "サイトから空の応答が返されました(Bot対策によるアクセス制限の可能性があります)",
      }
    }
    const charset = detectCharset(res.headers.get("content-type"), buf.slice(0, 2048))
    const html = new TextDecoder(charset ?? "utf-8").decode(buf)
    const $ = cheerio.load(html)
    const title = $("title").first().text().trim() || $("h1").first().text().trim()
    const imageCandidates = extractImageCandidatesFromHtml($, url)
    const commerceLinkCandidates = extractCommerceLinkCandidatesFromHtml($, url)
    $("script, style, nav, footer, header, noscript").remove()
    // 価格・発売日が本文末尾にあるECページでも、上限切り捨て前に根拠行を先頭へ移して保持する。
    const text = prioritizeProductFacts(extractBodyText($), BODY_TEXT_LIMIT)
    if (!title && !text) {
      return {
        imageCandidates,
        failureReason: "ページは取得できましたが本文を認識できませんでした(Bot対策の確認ページ等の可能性があります)",
      }
    }
    return { title: title || undefined, text: text || undefined, imageCandidates, commerceLinkCandidates }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
    return {
      imageCandidates: [],
      failureReason: isTimeout
        ? "サイトから応答がありませんでした(アクセス制限がかかっている可能性があります)"
        : "サイトに接続できませんでした",
    }
  }
}
