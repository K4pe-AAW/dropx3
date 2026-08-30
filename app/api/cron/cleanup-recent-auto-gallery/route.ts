import { NextRequest, NextResponse } from "next/server"
import { cleanupRecentAutoGallery } from "@/lib/recent-auto-gallery-cleanup"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.headers.get("x-cron-secret")
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ ok: true, ...(await cleanupRecentAutoGallery()) })
}
