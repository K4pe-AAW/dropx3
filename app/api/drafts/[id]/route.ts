import { NextRequest, NextResponse } from "next/server"
import { getDraftById, removeDraft } from "@/lib/storage"

/** DraftReviewPendingのポーリング用。生成直後の伝播遅延で見つからない下書きを見つかるまで軽く問い合わせる */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const draft = await getDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "下書きが見つかりません" }, { status: 404 })
  }
  return NextResponse.json({ draft })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const draft = await getDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "下書きが見つかりません" }, { status: 404 })
  }
  await removeDraft(id)
  return NextResponse.json({ ok: true })
}
