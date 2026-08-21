import { NextRequest, NextResponse } from "next/server"
import { brushUpDraftWithUrl } from "@/lib/draft-brushup"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** 一時診断API。「公式サイト限定」を外した後、非公式URL(ニュース記事等)でも動くかの実データ検証用。確認後に削除する。 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = req.nextUrl.searchParams.get("url")
  if (!url) return NextResponse.json({ error: "url必須" }, { status: 400 })

  try {
    const result = await brushUpDraftWithUrl(
      {
        title: "【デバッグ】A BATHING APEの新作が話題",
        excerpt: "人気ブランドから新しいアイテムが出るらしい。詳細は続報を待ちたい。",
        bodyParagraphs: ["人気ストリートブランドから新作が発表された。詳しい情報はまだ少ないが期待が高まる。"],
        colorways: [],
      },
      url
    )
    return NextResponse.json({ ...result, hasSourceRefField: "sourceRef" in result })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
