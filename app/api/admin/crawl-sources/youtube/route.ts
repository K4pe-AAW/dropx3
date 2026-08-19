import { NextRequest, NextResponse } from "next/server"
import { addYoutubeCrawlSource } from "@/lib/storage"
import { resolveYoutubeChannelId } from "@/lib/source-watch/youtube"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const url = typeof body?.url === "string" ? body.url.trim() : ""
  if (!name || !url) {
    return NextResponse.json({ error: "nameとurlは必須です" }, { status: 400 })
  }

  const channelId = await resolveYoutubeChannelId(url)
  if (!channelId) {
    return NextResponse.json(
      { error: "チャンネルIDを特定できませんでした。youtube.comのチャンネルURL(/channel/UC... または /@ハンドル)を指定してください" },
      { status: 400 }
    )
  }

  const source = await addYoutubeCrawlSource({ name, channelId, siteUrl: url })
  return NextResponse.json({ source })
}
