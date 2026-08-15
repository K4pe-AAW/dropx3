import { NextRequest, NextResponse } from "next/server"
import { promoteDueScheduledArticles } from "@/lib/storage"

/** Vercel Cronから15分おきに叩かれ、公開時刻を過ぎた予約記事をarticles.jsonへ昇格させる */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy

  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const result = await promoteDueScheduledArticles()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "予約公開の処理に失敗しました" },
      { status: 500 }
    )
  }
}
