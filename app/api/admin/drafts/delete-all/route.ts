import { NextResponse } from "next/server"
import { readDrafts, dismissDrafts } from "@/lib/storage"

export async function POST() {
  const { drafts } = await readDrafts()
  const deleted = await dismissDrafts(drafts.filter((d) => d.status === "pending").map((d) => d.id))
  return NextResponse.json({ deleted })
}
