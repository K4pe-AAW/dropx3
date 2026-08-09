import { NextRequest, NextResponse } from "next/server"
import { getPendingDrafts } from "@/lib/storage"

/** 一時的な確認用エンドポイント。下書き一覧をJSONで返す。使い終わったら削除する。 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-password")
  if (!process.env.ADMIN_PASSWORD || secret !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const drafts = await getPendingDrafts()
  return NextResponse.json({
    count: drafts.length,
    drafts,
  })
}
