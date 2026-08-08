import { NextRequest, NextResponse } from "next/server"
import { getDraftById, removeDraft } from "@/lib/storage"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const draft = getDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "下書きが見つかりません" }, { status: 404 })
  }
  removeDraft(id)
  return NextResponse.json({ ok: true })
}
