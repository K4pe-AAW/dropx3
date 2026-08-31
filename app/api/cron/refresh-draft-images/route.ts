import { NextRequest, NextResponse } from "next/server"
import { refreshAllDraftImages } from "@/lib/draft-image-refresh"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const offset = Number(req.nextUrl.searchParams.get("offset") ?? "0")
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20")
    return NextResponse.json(await refreshAllDraftImages({
      offset: Number.isFinite(offset) ? offset : 0,
      limit: Number.isFinite(limit) ? limit : 20,
    }))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "下書き画像の再収集に失敗しました" },
      { status: 500 }
    )
  }
}
