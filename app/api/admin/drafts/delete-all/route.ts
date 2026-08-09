import { NextResponse } from "next/server"
import { readDrafts, writeDrafts } from "@/lib/storage"

export async function POST() {
  const data = await readDrafts()
  const before = data.drafts.length
  data.drafts = data.drafts.filter((d) => d.status !== "pending")
  await writeDrafts(data)
  return NextResponse.json({ deleted: before - data.drafts.length })
}
