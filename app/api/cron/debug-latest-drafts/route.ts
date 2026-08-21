import { NextRequest, NextResponse } from "next/server"
import { readDrafts } from "@/lib/storage"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { drafts } = await readDrafts()
  const latest = [...drafts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10)

  return NextResponse.json({
    latest: latest.map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.createdAt,
      suggestedColorways: d.suggestedColorways ?? null,
    })),
  })
}
