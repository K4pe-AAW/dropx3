import { NextRequest, NextResponse } from "next/server"
import { migrateProductionContentToGossp } from "@/lib/gossp-production-migration"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    return NextResponse.json(await migrateProductionContentToGossp())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gossp!への変換に失敗しました" },
      { status: 500 }
    )
  }
}
