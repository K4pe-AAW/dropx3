import { NextRequest, NextResponse } from "next/server"
import { draftFromRawItem } from "@/lib/ai-draft"
import type { RawItem } from "@/lib/types"

export const dynamic = "force-dynamic"

/** 重複チェックを経由せず、任意のダミーRawItemでdraftFromRawItemを直接叩き、sourcePublishedAtの伝播だけを確認する */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const testPublishedAt = "2026-08-15T03:00:00.000Z"
  const item: RawItem = {
    id: "debug-test-item",
    sourceName: "デバッグテスト",
    sourceUrl: "https://example.com/debug-test-does-not-exist",
    title: "テスト記事タイトル",
    snippet: "これはsourcePublishedAtの伝播だけを確認するテストです。抜粋情報はありません。",
    publishedAt: testPublishedAt,
    fetchedAt: new Date().toISOString(),
  }

  try {
    const draft = await draftFromRawItem(item)
    return NextResponse.json({
      expectedSourcePublishedAt: testPublishedAt,
      actualSourcePublishedAt: draft.sourcePublishedAt,
      match: draft.sourcePublishedAt === testPublishedAt,
      createdAt: draft.createdAt,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
