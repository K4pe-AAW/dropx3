import { NextRequest, NextResponse } from "next/server"
import { runDueCrawls } from "@/lib/source-watch/crawl"

// 複数ソースを順番に巡回するため、デフォルトの実行時間制限では足りない場合がある(Vercel Pro向け)
export const maxDuration = 120

/**
 * 外部スケジューラから叩く想定。app/api/cron/collect/route.tsと同じ認証方式を踏襲する。
 * ソースごとのmonitoringIntervalMinutesに基づき「今巡回すべきもの」だけを処理するため、
 * このcron自体は短い間隔(30分)で叩いておけば、公式ニュース(60分)〜古着(10時間)まで
 * それぞれの頻度で自然に処理される。
 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy

  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const { results } = await runDueCrawls()
    return NextResponse.json({
      crawled: results.length,
      totalNew: results.reduce((sum, r) => sum + r.newCount, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errorCount, 0),
      results,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "巡回に失敗しました" }, { status: 500 })
  }
}
