import { NextRequest, NextResponse } from "next/server"
import { auditPublishedArticles } from "@/lib/published-article-audit"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.headers.get("x-cron-secret")
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json({ ok: true, ...(await auditPublishedArticles()) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "公開記事の再点検に失敗しました" },
      { status: 500 }
    )
  }
}
