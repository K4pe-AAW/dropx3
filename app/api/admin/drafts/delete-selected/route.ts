import { NextRequest, NextResponse } from "next/server"
import { dismissDrafts } from "@/lib/storage"

/** チェックした下書きを一覧から削除し、再収集防止用のURL履歴だけを保持する */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : []
  if (ids.length === 0) return NextResponse.json({ error: "idsが空です" }, { status: 400 })

  const deleted = await dismissDrafts(ids)
  return NextResponse.json({ deleted })
}
