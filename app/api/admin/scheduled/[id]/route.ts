import { NextRequest, NextResponse } from "next/server"
import { removeScheduledArticle } from "@/lib/storage"

/** 予約公開のキャンセル。下書きへは戻さず完全に削除する(再度必要なら作り直す運用) */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await removeScheduledArticle(id)
  return NextResponse.json({ ok: true })
}
