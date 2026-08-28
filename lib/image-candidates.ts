const TRANSFORM_QUERY_PARAMS = new Set([
  "w", "width", "h", "height", "q", "quality", "fit", "crop", "fm", "format", "auto", "dpr", "resize", "scale",
])

/**
 * CDNのリサイズ・画質指定だけが違うURLを同一画像として比較するためのキー。
 * パスや商品識別用のクエリは残すため、別商品を誤ってまとめない。
 */
export function canonicalImageKey(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    url.hash = ""
    for (const key of [...url.searchParams.keys()]) {
      if (TRANSFORM_QUERY_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key)
    }
    url.searchParams.sort()
    // WordPress等が生成する foo-300x300.jpg / foo-1200x800.webp を元画像と同一視する。
    url.pathname = url.pathname.replace(/-\d{2,5}x\d{2,5}(?=\.(?:avif|gif|jpe?g|png|webp)$)/i, "")
    return url.toString()
  } catch {
    return rawUrl.trim()
  }
}

export function deduplicateImageUrls(urls: string[], limit = 8): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const url of urls) {
    const key = canonicalImageKey(url)
    if (!url || seen.has(key)) continue
    seen.add(key)
    result.push(url)
    if (result.length >= limit) break
  }
  return result
}
