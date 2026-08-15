import { NextRequest, NextResponse } from "next/server"
import { runCollectAndDraft } from "@/lib/pipeline"

/** 全ソース分のAI下書き生成を直列で待つため、既定の実行時間上限では途中で打ち切られうる(詳細は/api/admin/collect参照) */
export const maxDuration = 300

/**
 * 外部スケジューラから叩く想定。/admin配下と違いcookie認証は使わない(ブラウザセッションがないため)。
 * - Vercel Cron(vercel.jsonのcrons)は`Authorization: Bearer $CRON_SECRET`を自動付与する。
 * - それ以外の外部スケジューラ向けに`x-cron-secret: $CRON_SECRET`ヘッダーも引き続き受け付ける。
 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy

  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const summary = await runCollectAndDraft()
    return NextResponse.json(summary)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "収集に失敗しました" },
      { status: 500 }
    )
  }
}
