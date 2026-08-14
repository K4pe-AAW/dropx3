import { NextRequest, NextResponse } from "next/server"
import { publishShopUpdate } from "@/lib/shop-update"
import { parseVintageShopForm } from "@/lib/vintage-shop-form"

/**
 * 古着屋(tonari/ROOM)の投稿を、人間が貼り付けたテキスト+アップロードした画像ファイルから公開する。
 * 画像はVercel Blobへ直接保存する(git commit/push/デプロイ待ちが不要——publish-shop-updateの
 * 旧フロー(`/images/xxx.jpg`をコミットしてから叩く)と違い、この管理画面から完結できる)。
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "invalid form data" }, { status: 400 })

  const parsed = await parseVintageShopForm(form)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const result = await publishShopUpdate({ ...parsed.value, extraBrands: [] })

  if ("error" in result) {
    return NextResponse.json({ error: result.error, existingSlug: result.existingSlug }, { status: result.status })
  }
  return NextResponse.json(result)
}
