import { NextRequest, NextResponse } from "next/server"
import { mutateDrafts, getDraftById, generateId } from "@/lib/storage"
import type { Draft } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * 一時診断API。「URLから記事を生成」直後のrouter.pushで読み取りが古いスナップショットを
 * 返す(Blob書き込み伝播遅延)問題を、実際に別リクエストとして再現するためのもの。
 * addDrafts()は300件上限で古いものを追い出すため使わず、mutateDraftsで直接insert/cleanupする
 * (本番の下書きキューを壊さないため)。確認後に削除する。
 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const action = req.nextUrl.searchParams.get("action")

  if (action === "insert") {
    const id = generateId(`race-test-${Date.now()}-${Math.random()}`)
    const fake: Draft = {
      id,
      status: "pending",
      title: "【race-test】一時テスト下書き",
      excerpt: "",
      bodyParagraphs: [],
      category: "sneaker",
      brands: [],
      tags: [],
      suggestedAffiliateSearch: [],
      sourceRefs: [{ name: "race-test", url: `https://example.com/race-test-${id}` }],
      createdAt: new Date().toISOString(),
    }
    const insertStart = Date.now()
    await mutateDrafts((data) => {
      data.drafts.unshift(fake)
      return data
    })
    return NextResponse.json({ id, insertMs: Date.now() - insertStart, insertedAt: Date.now() })
  }

  if (action === "check") {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id必須" }, { status: 400 })
    const t0 = Date.now()
    const found = await getDraftById(id)
    return NextResponse.json({ found: Boolean(found), checkMs: Date.now() - t0 })
  }

  if (action === "cleanup") {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id必須" }, { status: 400 })
    await mutateDrafts((data) => {
      data.drafts = data.drafts.filter((d) => d.id !== id)
      return data
    })
    return NextResponse.json({ cleaned: true })
  }

  return NextResponse.json({ error: "action必須(insert/check/cleanup)" }, { status: 400 })
}
