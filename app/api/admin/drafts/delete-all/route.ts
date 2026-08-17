import { NextResponse } from "next/server"
import { mutateDrafts } from "@/lib/storage"

export async function POST() {
  let deleted = 0
  await mutateDrafts((data) => {
    const before = data.drafts.length
    data.drafts = data.drafts.filter((d) => d.status !== "pending")
    deleted = before - data.drafts.length
    return data
  })
  return NextResponse.json({ deleted })
}
