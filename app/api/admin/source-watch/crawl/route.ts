import { NextRequest, NextResponse } from "next/server"
import { runDueCrawls } from "@/lib/source-watch/crawl"

/** 管理画面の「巡回する」ボタン。sourceIdを渡せばそのソースだけ即時巡回(頻度チェック無視)、省略時は期限が来ている全ソース */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  try {
    const { results } = await runDueCrawls(typeof body.sourceId === "string" ? body.sourceId : undefined)
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "巡回に失敗しました" }, { status: 500 })
  }
}
