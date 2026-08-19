import { NextResponse } from "next/server"
import { removeYoutubeCrawlSource } from "@/lib/storage"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await removeYoutubeCrawlSource(id)
  return NextResponse.json({ ok: true })
}
