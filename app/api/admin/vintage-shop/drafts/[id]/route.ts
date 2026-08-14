import { NextRequest, NextResponse } from "next/server"
import { getVintageDraftById, removeVintageDraft } from "@/lib/vintage-drafts"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const draft = await getVintageDraftById(id)
  if (!draft) return NextResponse.json({ error: "下書きが見つかりません" }, { status: 404 })
  await removeVintageDraft(id)
  return NextResponse.json({ ok: true })
}
