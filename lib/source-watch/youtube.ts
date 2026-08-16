/**
 * YouTubeチャンネルURL(/channel/UC…形式 or /@handle形式)からRSS用のチャンネルID(UC…)を解決する。
 * @handle形式はRSSフィードを直接構築できないため、チャンネルページのcanonical linkから
 * チャンネルIDを取得する(lib/sources.tsのYOUTUBE_SOURCESコメントに書かれた既存の手動手順を自動化しただけ)。
 */
export async function resolveYoutubeChannelId(inputUrl: string): Promise<string | null> {
  let url: URL
  try {
    url = new URL(inputUrl)
  } catch {
    return null
  }
  if (!/(^|\.)youtube\.com$/.test(url.hostname)) return null

  const directMatch = url.pathname.match(/\/channel\/(UC[\w-]{10,})/)
  if (directMatch) return directMatch[1]

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36" },
    })
    if (!res.ok) return null
    const html = await res.text()
    const canonicalMatch = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{10,})">/)
    if (canonicalMatch) return canonicalMatch[1]
    const jsonMatch = html.match(/"channelId":"(UC[\w-]{10,})"/)
    return jsonMatch ? jsonMatch[1] : null
  } catch {
    return null
  }
}

export function youtubeChannelRssUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
}
