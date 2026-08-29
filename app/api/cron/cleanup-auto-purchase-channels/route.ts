import { NextRequest, NextResponse } from "next/server"
import { cleanupAutoPublishedPurchaseChannels } from "@/lib/auto-purchase-channel-cleanup"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json({ ok: true, ...(await cleanupAutoPublishedPurchaseChannels()) })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "自動公開記事の販売リンク整理に失敗しました" },
      { status: 500 }
    )
  }
}
