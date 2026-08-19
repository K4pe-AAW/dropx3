import { NextResponse } from "next/server"
import { removeBrandCrawlSource } from "@/lib/storage"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await removeBrandCrawlSource(id)
  return NextResponse.json({ ok: true })
}
