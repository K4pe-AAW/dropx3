import { NextRequest, NextResponse } from "next/server"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { getSource, listSources } from "@/lib/source-watch/storage"
import { analyzeSocialPost, DuplicatePostError } from "@/lib/source-watch/social-crawl"
import { toProductCard } from "@/lib/source-watch/present"

/**
 * 「Instagram投稿URLを貼る」の実行エンドポイント。人間が用意したURL+キャプション本文を受け取り、
 * AI抽出→Product反映まで行う。画像は自動生成しない(social-crawl.ts参照)。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })

  const sourceId = typeof body.sourceId === "string" ? body.sourceId : ""
  const url = typeof body.url === "string" ? body.url.trim() : ""
  const caption = typeof body.caption === "string" ? body.caption.trim() : ""

  if (!sourceId) return NextResponse.json({ error: "アカウント(sourceId)を選択してください" }, { status: 400 })
  if (!url || !isSafeExternalUrl(url)) return NextResponse.json({ error: "有効な投稿URLを入力してください" }, { status: 400 })
  if (!caption) return NextResponse.json({ error: "キャプション本文を貼り付けてください(自動取得はしません)" }, { status: 400 })

  const source = await getSource(sourceId)
  if (!source) return NextResponse.json({ error: "ソースが見つかりません" }, { status: 404 })

  try {
    const { product, sourceLinks } = await analyzeSocialPost(source, url, caption)
    const sources = await listSources()
    return NextResponse.json(toProductCard(product, sourceLinks, [], sources))
  } catch (err) {
    if (err instanceof DuplicatePostError) return NextResponse.json({ error: err.message }, { status: 409 })
    return NextResponse.json({ error: err instanceof Error ? err.message : "解析に失敗しました" }, { status: 500 })
  }
}
