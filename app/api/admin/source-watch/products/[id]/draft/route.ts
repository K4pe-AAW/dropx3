import { NextRequest, NextResponse } from "next/server"
import { getProduct } from "@/lib/source-watch/storage"
import { buildDraftFromProduct } from "@/lib/source-watch/draft-builder"

/**
 * 「記事候補を見る」。REPORTED/RUMORも下書き化でき、情報の確度は公開表示へ引き継ぐ。
 * 画像権利・出典なし・誤断定等の確実NG条件はreadinessと公開処理側で止める。
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
    return NextResponse.json({ ok: true, draftId: draft.id, draft })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "記事候補の生成に失敗しました" }, { status: 500 })
  }
}
