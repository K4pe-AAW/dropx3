import { NextRequest, NextResponse } from "next/server"
import { resolveYoutubeChannelId } from "@/lib/source-watch/youtube"

/**
 * 一時診断用。「Youtube追加が機能していない」の原因切り分け(Vercel本番ネットワークから
 * resolveYoutubeChannelIdが実際に解決できるか確認)。確認後すぐ削除する。
 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = req.nextUrl.searchParams.get("url") ?? "https://www.youtube.com/@mkbhd"
  const startedAt = Date.now()
  try {
    const channelId = await resolveYoutubeChannelId(url)
    return NextResponse.json({ url, channelId, elapsedMs: Date.now() - startedAt })
  } catch (err) {
    return NextResponse.json({
      url,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      elapsedMs: Date.now() - startedAt,
    })
  }
}
