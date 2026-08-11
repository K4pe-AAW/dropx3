import { NextRequest, NextResponse } from "next/server"
import { getProduct } from "@/lib/source-watch/storage"
import { buildDraftFromProduct, NotConfirmedError } from "@/lib/source-watch/draft-builder"

/**
 * 「記事候補を見る」。CONFIRMED以外はNotConfirmedErrorで拒否する(UIでもボタンを出さないが、
 * APIレベルでも二重に防御する — REPORTED/RUMORから直接記事化される抜け道を作らない)。
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 })
  if (product.draftId) {
    return NextResponse.json({ ok: true, draftId: product.draftId, alreadyExists: true })
  }

  try {
    const draft = await buildDraftFromProduct(product)
    return NextResponse.json({ ok: true, draftId: draft.id })
  } catch (err) {
    if (err instanceof NotConfirmedError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "記事候補の生成に失敗しました" }, { status: 500 })
  }
}
