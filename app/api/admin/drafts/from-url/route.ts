import { NextResponse } from "next/server"
import { draftsFromUrls } from "@/lib/url-draft"

/** ページ取得+AI生成(最大6件・3並列)を待つため、Vercelの短いデフォルト実行時間上限を明示的に伸ばす */
export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { urls } = await req.json()
    const list = Array.isArray(urls)
      ? urls.filter((u): u is string => typeof u === "string" && u.trim().length > 0).map((u) => u.trim())
      : []
    if (list.length === 0) {
      return NextResponse.json({ error: "URLを入力してください" }, { status: 400 })
    }
    const results = await draftsFromUrls(list)
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "生成に失敗しました" }, { status: 500 })
  }
}
