import { NextResponse } from "next/server"
import { getCrawlSources, readDrafts, getAllArticles } from "@/lib/storage"
import { youtubeChannelRssUrl } from "@/lib/source-watch/youtube"

export const dynamic = "force-dynamic"

export async function GET() {
  const [{ youtube }, { drafts }, articles] = await Promise.all([getCrawlSources(), readDrafts(), getAllArticles()])

  const youtubeDrafts = drafts
    .filter((d) => d.category === "youtube")
    .map((d) => ({ id: d.id, title: d.title, createdAt: d.createdAt, source: d.sourceRefs[0]?.name, url: d.sourceRefs[0]?.url }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const youtubeArticles = articles
    .filter((a) => a.category === "youtube")
    .map((a) => ({ id: a.id, title: a.title, publishedAt: a.publishedAt, source: a.sourceRefs[0]?.name, url: a.sourceRefs[0]?.url }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  // 各登録チャンネルのRSSが実際に疎通するか、直近アイテムのタイトル・日付も合わせて確認する
  const feedChecks = await Promise.all(
    youtube.map(async (y) => {
      try {
        const rssUrl = youtubeChannelRssUrl(y.channelId)
        const res = await fetch(rssUrl, { signal: AbortSignal.timeout(10000) })
        if (!res.ok) return { name: y.name, channelId: y.channelId, ok: false, status: res.status }
        const xml = await res.text()
        const titleMatches = [...xml.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => m[1])
        const pubDateMatches = [...xml.matchAll(/<published>([^<]*)<\/published>/g)].map((m) => m[1])
        return {
          name: y.name,
          channelId: y.channelId,
          ok: true,
          latestTitles: titleMatches.slice(1, 4),
          latestPublished: pubDateMatches.slice(0, 3),
        }
      } catch (err) {
        return { name: y.name, channelId: y.channelId, ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    })
  )

  return NextResponse.json({
    registeredChannels: youtube,
    youtubeDraftCount: youtubeDrafts.length,
    youtubeDrafts,
    youtubeArticleCount: youtubeArticles.length,
    youtubeArticlesLatest10: youtubeArticles.slice(0, 10),
    feedChecks,
  })
}
