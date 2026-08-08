import { NextRequest, NextResponse } from "next/server"
import { runCollectAndDraft } from "@/lib/pipeline"

/**
 * 外部スケジューラ(Vercel Cron / system cron等)から
 * `curl -H "x-cron-secret: $CRON_SECRET" https://.../api/cron/collect`
 * の形で叩く想定。/admin配下と違いcookie認証は使わない（ブラウザセッションがないため）。
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const summary = await runCollectAndDraft()
    return NextResponse.json(summary)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "収集に失敗しました" },
      { status: 500 }
    )
  }
}
