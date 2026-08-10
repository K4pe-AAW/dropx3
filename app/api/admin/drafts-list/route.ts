import { NextResponse } from "next/server"
import { getPendingDrafts } from "@/lib/storage"

export async function GET() {
  const drafts = await getPendingDrafts()
  return NextResponse.json(drafts)
}
