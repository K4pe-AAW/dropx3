import { NextResponse } from "next/server"
import { runCollectAndDraft } from "@/lib/pipeline"

/**
 * 全ソース分のAI下書き生成(OpenAI呼び出し)を直列で待つため、Vercelのデフォルト実行時間上限
 * (maxDuration未指定時は短い、Pro環境でも既定は十分でない)では処理途中で強制終了され、
 * addDrafts()まで到達せず何も保存されずに終わることがある(YOUTUBE_SOURCES追加でソース数が
 * 増えた際に実際に発生・特定した不具合)。Proプランの上限まで明示的に確保する。
 */
export const maxDuration = 300

export async function POST() {
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
