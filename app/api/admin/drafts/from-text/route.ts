import { NextResponse } from "next/server"
import { draftFromPastedText } from "@/lib/url-draft"

/** AI生成(gpt-4o-mini)を待つため、Vercelの短いデフォルト実行時間上限を明示的に伸ばす */
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { url, title, text } = await req.json()
    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "URLを入力してください" }, { status: 400 })
    }
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "タイトルを入力してください" }, { status: 400 })
    }
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "本文を貼り付けてください" }, { status: 400 })
    }
    const draft = await draftFromPastedText(url.trim(), title, text)
    return NextResponse.json({ draft })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "生成に失敗しました" }, { status: 500 })
  }
}
