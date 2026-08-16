import { NextRequest, NextResponse } from "next/server"
import { readDrafts, writeDrafts } from "@/lib/storage"

/**
 * 一時admin API。画像未設定ドラフトの一括ソーシング用に、複数ドラフトのsuggestedCoverImageを
 * まとめて設定する。1件ずつread-modify-writeするとBlob伝播遅延・競合リスクが増えるため、
 * lib/source-watch/storage.tsやdelete-selectedと同じく単一トランザクション(1回読み→1回書き)で行う。
 * 使用後削除。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const updates: { id: string; suggestedCoverImage: string }[] = Array.isArray(body?.updates)
    ? body.updates.filter(
        (u: unknown): u is { id: string; suggestedCoverImage: string } =>
          typeof u === "object" &&
          u !== null &&
          typeof (u as { id?: unknown }).id === "string" &&
          typeof (u as { suggestedCoverImage?: unknown }).suggestedCoverImage === "string"
      )
    : []
  if (updates.length === 0) return NextResponse.json({ error: "updatesが空です" }, { status: 400 })

  const data = await readDrafts()
  const updatedIds: string[] = []
  const missingIds: string[] = []

  for (const u of updates) {
    const draft = data.drafts.find((d) => d.id === u.id)
    if (!draft) {
      missingIds.push(u.id)
      continue
    }
    draft.suggestedCoverImage = u.suggestedCoverImage
    updatedIds.push(u.id)
  }

  if (updatedIds.length > 0) {
    await writeDrafts(data)
  }

  return NextResponse.json({ updated: updatedIds.length, updatedIds, missingIds })
}
