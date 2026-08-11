import { NextRequest, NextResponse } from "next/server"
import { updateProductsBulk } from "@/lib/source-watch/storage"
import type { ProductReviewStatus } from "@/lib/source-watch/types"

const REVIEW_STATUS_FOR_ACTION: Record<string, ProductReviewStatus> = {
  ignore: "ignored",
  hold: "held",
  unhold: "pending",
}

/**
 * 一括操作。無視/保留/保留解除のみ(状態遷移のみで済む安全な操作)。
 * 「公開」に相当する操作(記事候補化=draft生成)はここに含めない — 一括で下書き化すると
 * 人間が中身を見ずに大量のCONFIRMED商品を素通りさせてしまう恐れがあるため、意図的に対象外にする。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((v: unknown): v is string => typeof v === "string") : []
  const action = typeof body?.action === "string" ? body.action : ""
  const reviewStatus = REVIEW_STATUS_FOR_ACTION[action]

  if (ids.length === 0 || !reviewStatus) {
    return NextResponse.json({ error: "idsと有効なaction(ignore/hold/unhold)が必要です" }, { status: 400 })
  }

  const updated = await updateProductsBulk(ids, { reviewStatus })
  return NextResponse.json({ ok: true, updated })
}
