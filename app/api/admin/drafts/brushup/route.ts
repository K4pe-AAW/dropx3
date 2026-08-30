import { NextResponse } from "next/server"
import { brushUpDraftWithUrl, type BrushUpCurrentDraft } from "@/lib/draft-brushup"
import { isInformationStatus } from "@/lib/information-status"

/** ページ取得+AI生成を待つため、Vercelの短いデフォルト実行時間上限を明示的に伸ばす(from-url/route.tsと同じ理由) */
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { url, title, excerpt, bodyParagraphs, colorways } = body
    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "URLを入力してください" }, { status: 400 })
    }

    const current: BrushUpCurrentDraft = {
      title: typeof title === "string" ? title : "",
      excerpt: typeof excerpt === "string" ? excerpt : "",
      bodyParagraphs: Array.isArray(bodyParagraphs) ? bodyParagraphs.filter((p) => typeof p === "string") : [],
      ...(isInformationStatus(body.informationStatus) ? { informationStatus: body.informationStatus } : {}),
      colorways: Array.isArray(colorways)
        ? colorways
            .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
            .map((c) => ({
              colorName: typeof c.colorName === "string" ? c.colorName : "",
              ...(typeof c.styleCode === "string" ? { styleCode: c.styleCode } : {}),
              ...(typeof c.price === "string" ? { price: c.price } : {}),
              ...(typeof c.size === "string" ? { size: c.size } : {}),
              ...(typeof c.releaseDate === "string" ? { releaseDate: c.releaseDate } : {}),
            }))
        : [],
    }

    const result = await brushUpDraftWithUrl(current, url.trim())
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ブラッシュアップに失敗しました" },
      { status: 500 }
    )
  }
}
