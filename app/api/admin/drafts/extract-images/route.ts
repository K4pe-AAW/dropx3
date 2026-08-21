import { NextResponse } from "next/server"
import { extractImageColorwayInfo } from "@/lib/image-colorway-extract"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "テキストを入力してください" }, { status: 400 })
    }
    const result = await extractImageColorwayInfo(text)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "読み取りに失敗しました" },
      { status: 500 }
    )
  }
}
