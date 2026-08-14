import { NextRequest, NextResponse } from "next/server"
import { readVintageDrafts, addVintageDraft } from "@/lib/vintage-drafts"
import { parseVintageShopForm } from "@/lib/vintage-shop-form"

/** 下書き一覧(新しい順) */
export async function GET() {
  const { drafts } = await readVintageDrafts()
  return NextResponse.json({ drafts })
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
