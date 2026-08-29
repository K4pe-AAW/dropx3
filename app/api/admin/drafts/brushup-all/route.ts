import { NextResponse } from "next/server"
import { runBulkBrushup } from "@/scripts/brushup-all-drafts"

export const maxDuration = 300

export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!process.env.CRON_SECRET || bearer !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const offset = Number.isFinite(body.offset) ? Math.max(0, Math.floor(body.offset)) : 0
    const limit = Number.isFinite(body.limit) ? Math.min(10, Math.max(1, Math.floor(body.limit))) : 5
    const result = await runBulkBrushup({ offset, limit, backup: body.backup !== false })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
