import { NextRequest, NextResponse } from "next/server"
import { runPublishedArticleRecheck } from "@/lib/published-article-recheck"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json(await runPublishedArticleRecheck())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "公開済み記事の再確認に失敗しました" },
      { status: 500 }
    )
  }
}
