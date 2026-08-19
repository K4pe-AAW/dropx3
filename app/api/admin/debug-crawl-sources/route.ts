import { NextResponse } from "next/server"
import { head } from "@vercel/blob"

export async function GET() {
  const info = await head("data/crawl-sources.json").catch((e) => ({ error: String(e) }))
  if ("error" in info) return NextResponse.json(info)

  const bustedUrl = `${info.url}${info.url.includes("?") ? "&" : "?"}_=${Date.now()}`
  const res = await fetch(bustedUrl, { cache: "no-store" })
  const text = await res.text()

  return NextResponse.json({
    blobUrl: info.url,
    blobUploadedAt: info.uploadedAt,
    fetchStatus: res.status,
    fetchCacheHeader: res.headers.get("age"),
    rawTextLength: text.length,
    rawText: text,
  })
}
