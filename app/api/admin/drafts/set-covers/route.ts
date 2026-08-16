import { NextRequest, NextResponse } from "next/server"
import { readDrafts, writeDrafts, putBlobFile } from "@/lib/storage"
import { isSafeExternalUrl } from "@/lib/affiliate"

function extFromContentType(type: string): string {
  if (type.includes("png")) return "png"
  if (type.includes("webp")) return "webp"
  if (type.includes("gif")) return "gif"
  return "jpg"
}

/**
 * 一時admin API(画像ソーシング一括反映用)。検証済みの公式画像URLを受け取り、
 * サーバー側でダウンロード→Blobへ再アップロード→該当下書きのsuggestedCoverImageに設定する。
 * 単一トランザクション(drafts.jsonの読み書きは1回ずつ)。使用後削除。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const items: { id: string; imageUrl: string }[] = Array.isArray(body?.items)
    ? body.items.filter(
        (i: unknown): i is { id: string; imageUrl: string } =>
          typeof i === "object" &&
          i !== null &&
          typeof (i as Record<string, unknown>).id === "string" &&
          typeof (i as Record<string, unknown>).imageUrl === "string"
      )
    : []
  if (items.length === 0) return NextResponse.json({ error: "itemsが空です" }, { status: 400 })

  const results: { id: string; ok: boolean; url?: string; error?: string }[] = []
  const uploaded: { id: string; url: string }[] = []

  for (const item of items) {
    if (!isSafeExternalUrl(item.imageUrl)) {
      results.push({ id: item.id, ok: false, error: "不正な画像URL" })
      continue
    }
    try {
      const res = await fetch(item.imageUrl)
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
      const contentType = res.headers.get("content-type") || "image/jpeg"
      const buffer = Buffer.from(await res.arrayBuffer())
      const url = await putBlobFile(`images/drafts/${item.id}.${extFromContentType(contentType)}`, buffer, contentType)
      uploaded.push({ id: item.id, url })
      results.push({ id: item.id, ok: true, url })
    } catch (err) {
      results.push({ id: item.id, ok: false, error: err instanceof Error ? err.message : "unknown error" })
    }
  }

  if (uploaded.length > 0) {
    const data = await readDrafts()
    for (const u of uploaded) {
      const draft = data.drafts.find((d) => d.id === u.id)
      if (draft) draft.suggestedCoverImage = u.url
    }
    await writeDrafts(data)
  }

  return NextResponse.json({ results })
}
