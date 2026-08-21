import { NextRequest, NextResponse } from "next/server"
import { brushUpDraftWithUrl } from "@/lib/draft-brushup"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** 一時診断API。ブラッシュアップ機能(lib/draft-brushup.ts)の実データ検証用。確認後に削除する。 */
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
        title: "【デバッグ】適当なデニムの新作が登場",
        excerpt: "とあるブランドから新しいデニムが出るらしい。詳細は続報を待ちたい。",
        bodyParagraphs: [
          "とあるブランドから新しいデニムが発表された。詳しい情報はまだ少ないが、期待が高まる一着だ。",
          "続報が入り次第お伝えしたい。",
        ],
        colorways: [{ colorName: "インディゴ" }],
      },
      url
    )
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
