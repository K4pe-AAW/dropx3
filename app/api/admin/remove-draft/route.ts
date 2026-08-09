import { NextRequest, NextResponse } from "next/server"
import { removeDraft } from "@/lib/storage"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const id = body?.id
  if (typeof id !== "string") return NextResponse.json({ error: "id must be a string" }, { status: 400 })
  await removeDraft(id)
  return NextResponse.json({ ok: true })
}
