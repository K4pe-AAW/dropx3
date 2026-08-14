import { NextRequest, NextResponse } from "next/server"
import { readDrafts, writeDrafts } from "@/lib/storage"

/** チェックした下書きだけをまとめて削除する。単一トランザクション(1回読み→1回書き)で行う */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : []
  if (ids.length === 0) return NextResponse.json({ error: "idsが空です" }, { status: 400 })

  const idSet = new Set(ids)
  const data = await readDrafts()
  const before = data.drafts.length
  data.drafts = data.drafts.filter((d) => !idSet.has(d.id))
  await writeDrafts(data)
  return NextResponse.json({ deleted: before - data.drafts.length })
}
