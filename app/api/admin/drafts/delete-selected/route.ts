import { NextRequest, NextResponse } from "next/server"
import { mutateDrafts } from "@/lib/storage"

/** チェックした下書きだけをまとめて削除する。mutateDrafts(ETag楽観的排他制御)で他の下書き操作との競合を防ぐ */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : []
  if (ids.length === 0) return NextResponse.json({ error: "idsが空です" }, { status: 400 })

  const idSet = new Set(ids)
  let deleted = 0
  await mutateDrafts((data) => {
    const before = data.drafts.length
    data.drafts = data.drafts.filter((d) => !idSet.has(d.id))
    deleted = before - data.drafts.length
    return data
  })
  return NextResponse.json({ deleted })
}
