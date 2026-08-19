import { NextResponse } from "next/server"
import { draftFromUrl } from "@/lib/url-draft"

/** ページ取得+AI生成を待つため、Vercelの短いデフォルト実行時間上限を明示的に伸ばす(collect/route.tsと同じ理由) */
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "URLを入力してください" }, { status: 400 })
    }
    const draft = await draftFromUrl(url.trim())
    return NextResponse.json({ draftId: draft.id })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "生成に失敗しました" }, { status: 500 })
  }
}
