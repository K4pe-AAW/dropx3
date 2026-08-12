import { NextRequest, NextResponse } from "next/server"
import { extractShopPostDraft } from "@/lib/vintage-shop-extract"
import { SHOP_INFO } from "@/lib/shop-update"

/**
 * 人間が貼り付けたInstagramキャプション本文からAIで記事下書きを生成する(副作用なし、保存はしない)。
 * 生成結果はapp/(site)/admin/vintage-shopのフォームで人間がレビュー・編集してから
 * /api/admin/vintage-shop/publish で実際に公開する。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })

  const shopInfo = SHOP_INFO[body.shop]
  if (!shopInfo) {
    return NextResponse.json({ error: `shop must be one of: ${Object.keys(SHOP_INFO).join(", ")}` }, { status: 400 })
  }
  const postUrl = typeof body.postUrl === "string" ? body.postUrl.trim() : ""
  const caption = typeof body.caption === "string" ? body.caption.trim() : ""
  if (!caption) {
    return NextResponse.json({ error: "captionが空です" }, { status: 400 })
  }

  const draft = await extractShopPostDraft(shopInfo.label, caption, postUrl)
  return NextResponse.json(draft)
}
