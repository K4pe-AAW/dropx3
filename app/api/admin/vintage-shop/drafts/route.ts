import { NextRequest, NextResponse } from "next/server"
import { readVintageDrafts, addVintageDraft } from "@/lib/vintage-drafts"
import { parseVintageShopForm } from "@/lib/vintage-shop-form"

/**
 * 下書き一覧(新しい順)。ブラウザ側のfetchキャッシュにより削除・保存直後の一覧が古いまま
 * 見えることがある不具合を実際に確認したため、Cache-Controlを明示してブラウザキャッシュを禁止する
 * (クライアント側のfetch呼び出しでも`cache: "no-store"`を指定、二重で防止)。
 */
export async function GET() {
  const { drafts } = await readVintageDrafts()
  return NextResponse.json({ drafts }, { headers: { "Cache-Control": "no-store" } })
}

/** 現在のフォーム内容を下書きとして保存する(画像はこの時点でBlobへアップロード済みにする) */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "invalid form data" }, { status: 400 })

  const parsed = await parseVintageShopForm(form)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const draft = await addVintageDraft(parsed.value)
  return NextResponse.json({ ok: true, draft })
}
