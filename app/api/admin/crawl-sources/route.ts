import { NextResponse } from "next/server"
import { getCrawlSources } from "@/lib/storage"

export async function GET() {
  const data = await getCrawlSources()
  return NextResponse.json(data)
}
