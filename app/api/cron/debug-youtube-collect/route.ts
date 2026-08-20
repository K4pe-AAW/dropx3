import { NextRequest, NextResponse } from "next/server"
import { getCrawlSources, readDrafts, getAllArticles } from "@/lib/storage"
import { youtubeChannelRssUrl } from "@/lib/source-watch/youtube"

export const dynamic = "force-dynamic"

/**
 * proxy.tsのmatcherは/api/admin/*と/api/drafts/*のみ保護対象にしており/api/cron/*は対象外
 * (cronは管理画面ログインCookieを持てないため)。CRON_SECRETで認証する一時診断API。
 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const [{ youtube }, { drafts }, articles] = await Promise.all([getCrawlSources(), readDrafts(), getAllArticles()])

  const youtubeDrafts = drafts
    .filter((d) => d.category === "youtube")
    .map((d) => ({ id: d.id, title: d.title, createdAt: d.createdAt, source: d.sourceRefs[0]?.name, url: d.sourceRefs[0]?.url }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const youtubeArticles = articles
    .filter((a) => a.category === "youtube")
    .map((a) => ({ id: a.id, title: a.title, publishedAt: a.publishedAt, source: a.sourceRefs[0]?.name, url: a.sourceRefs[0]?.url }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

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
