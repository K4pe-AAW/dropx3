import { NextRequest, NextResponse } from "next/server"
import { runDailyAutoPublish } from "@/lib/daily-auto-publish"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json({ ok: true, ...(await runDailyAutoPublish()) })
  } catch (err) {
    console.error("daily-auto-publish failed", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "自動公開に失敗しました" },
      { status: 500 }
    )
  }
}
