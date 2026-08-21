import { NextRequest, NextResponse } from "next/server"
import { draftFromUrl } from "@/lib/url-draft"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url).searchParams.get("url")
  if (!url) return NextResponse.json({ error: "url query param required" }, { status: 400 })

  try {
    const draft = await draftFromUrl(url)
    return NextResponse.json({ ok: true, draft })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
