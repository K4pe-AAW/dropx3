import { NextResponse } from "next/server"
import { runCollectAndDraft } from "@/lib/pipeline"

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
