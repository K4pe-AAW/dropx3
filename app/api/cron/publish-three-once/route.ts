import { NextRequest, NextResponse } from "next/server"
import { runDailyAutoPublish } from "@/lib/daily-auto-publish"
import { runCollectAndDraft } from "@/lib/pipeline"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// 通常枠や過去の一時公開と衝突しない固定スロット。
const ONE_OFF_SLOT_DATE = new Date("2099-01-05T23:00:00.000Z")

export async function GET(req: NextRequest) {
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.headers.get("x-cron-secret")
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const collected = await runCollectAndDraft()
    const published = await runDailyAutoPublish(ONE_OFF_SLOT_DATE, 1)
    return NextResponse.json({ ok: true, collected, ...published })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "3件の即時公開に失敗しました" },
      { status: 500 }
    )
  }
}
