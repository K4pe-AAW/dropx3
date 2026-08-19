import { NextRequest, NextResponse } from "next/server"
import { addBrandCrawlSource } from "@/lib/storage"
import { isSafeExternalUrl } from "@/lib/affiliate"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const url = typeof body?.url === "string" ? body.url.trim() : ""
  const instagramUrl = typeof body?.instagramUrl === "string" ? body.instagramUrl.trim() : ""

  if (!name || !url) {
    return NextResponse.json({ error: "nameとurlは必須です" }, { status: 400 })
  }
  if (!isSafeExternalUrl(url)) {
    return NextResponse.json({ error: "urlはhttp(s)の有効なURLで指定してください" }, { status: 400 })
  }
  if (instagramUrl && !isSafeExternalUrl(instagramUrl)) {
    return NextResponse.json({ error: "instagramUrlはhttp(s)の有効なURLで指定してください" }, { status: 400 })
  }

  const source = await addBrandCrawlSource({ name, url, ...(instagramUrl ? { instagramUrl } : {}) })
  return NextResponse.json({ source })
}
