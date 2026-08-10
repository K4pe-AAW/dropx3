import { NextResponse } from "next/server"
import { readDrafts } from "@/lib/storage"

export async function GET() {
  const { drafts } = await readDrafts()
  const match = drafts.find((d) => d.sourceRefs.some((r) => r.url.includes("hoka-tor-ultra-lo-antique-olive")))
  return NextResponse.json(match ?? { error: "not found" })
}
