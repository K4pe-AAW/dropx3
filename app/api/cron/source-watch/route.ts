import { NextRequest, NextResponse } from "next/server"
import { runDueCrawls } from "@/lib/source-watch/crawl"

// 複数ソースを順番に巡回するため、デフォルトの実行時間制限では足りない場合がある(Vercel Pro向け)。
// 画像候補が空のソースは記事ページを追加取得するようになった分、120秒では不足するようになったため
// lib/pipeline.tsのrunCollectAndDraftと同じ上限まで伸ばす(2026-08-21、実際にタイムアウトを確認して対応)。
export const maxDuration = 300

/**
 * 外部スケジューラから叩く想定。app/api/cron/collect/route.tsと同じ認証方式を踏襲する。
 * ソースごとのmonitoringIntervalMinutesに基づき「今巡回すべきもの」だけを処理する。
 * cron自体は4時間おき(vercel.json)。個別ソースの間隔をそれより短くしても、実際の
 * 巡回頻度は最短4時間になる(このcronの実行タイミングが唯一のトリガーのため)。
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
