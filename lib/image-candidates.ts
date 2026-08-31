const TRANSFORM_QUERY_PARAMS = new Set([
  "w", "width", "h", "height", "q", "quality", "fit", "crop", "fm", "format", "auto", "dpr", "resize", "scale",
])

const IMAGE_NOISE_PATTERN =
  /(?:^|[\/_\-.?=&%])(icon|favicon|logo|logomark|brandmark|sprite|pixel|tracking|avatar|profile|author|share|social|sns|facebook|twitter|x-logo|instagram|line|tiktok|youtube|pinterest|whatsapp|spinner|loading|placeholder|badge|banner|advert|recommend|related)(?:[\/_\-.?=&%]|$)/i

const GENERIC_ASSET_TOKENS = new Set([
  "image", "img", "photo", "picture", "product", "detail", "main", "large", "small", "thumb", "thumbnail",
  "front", "back", "side", "pc", "sp", "desktop", "mobile", "original", "upload", "uploads", "media",
])

export function isImageNoiseUrl(rawUrl: string): boolean {
  if (!rawUrl || rawUrl.startsWith("data:")) return true
  try {
    const url = new URL(rawUrl)
    return IMAGE_NOISE_PATTERN.test(`${decodeURIComponent(url.pathname)}?${url.searchParams.toString()}`)
  } catch {
    return true
  }
}

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
    if (!url || isImageNoiseUrl(url) || seen.has(key)) continue
    seen.add(key)
    result.push(url)
    if (result.length >= limit) break
  }
  return result
}

function assetTokens(url: URL): Set<string> {
  const filename = decodeURIComponent(url.pathname.split("/").pop() ?? "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/-\d{2,5}x\d{2,5}$/i, "")
    .toLowerCase()
  return new Set(
    filename
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4 && !/^\d+$/.test(token) && !GENERIC_ASSET_TOKENS.has(token))
  )
}

/**
 * 関連記事・おすすめ商品・別ブランドの画像を混ぜないための厳格な同一商品判定。
 * 同じ配信元とディレクトリにあり、ファイル名の商品識別子も一致する画像だけを同じ群とみなす。
 * 識別子を持たない連番画像は、枚数より正確さを優先して採用しない。
 */
export function isSameProductAssetFamily(coverRaw: string, candidateRaw: string): boolean {
  if (isImageNoiseUrl(coverRaw) || isImageNoiseUrl(candidateRaw)) return false
  try {
    const cover = new URL(coverRaw)
    const candidate = new URL(candidateRaw)
    if (cover.origin !== candidate.origin) return false
    const coverDirectory = cover.pathname.slice(0, cover.pathname.lastIndexOf("/") + 1)
    const candidateDirectory = candidate.pathname.slice(0, candidate.pathname.lastIndexOf("/") + 1)
    if (coverDirectory !== candidateDirectory) return false
    const coverTokens = assetTokens(cover)
    return [...assetTokens(candidate)].some((token) => coverTokens.has(token))
  } catch {
    return false
  }
}

/** カバーを必ず先頭に残し、追加画像は同一商品と確認できる候補だけに絞る。 */
export function selectProductImageCandidates(urls: string[], limit = 8): string[] {
  const clean = deduplicateImageUrls(urls, Math.max(limit * 4, 24))
  const cover = clean[0]
  if (!cover) return []
  return [cover, ...clean.slice(1).filter((url) => isSameProductAssetFamily(cover, url))].slice(0, limit)
}
