import { NextRequest, NextResponse } from "next/server"
import { getAllArticles, getDraftById, removeDraft, addScheduledArticle, getScheduledArticles } from "@/lib/storage"
import { buildArticleFromDraft } from "@/lib/draft-publish"
import { computeNextSlot } from "@/lib/publish-schedule"
import type { ScheduledArticle } from "@/lib/types"
import { findDuplicateSnap } from "@/lib/snap"

/**
 * 8,10,...,22時(JST)・各枠2件という固定ペースの「次に空いている枠」を自動計算して予約する。
 * /api/drafts/[id]/scheduleと違い時刻はクライアントから受け取らずサーバー側で決める。
 * 内容のバリデーション・レビューはこれまで通り(publish/scheduleと同じbuildArticleFromDraftを通す)。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // publishと同じ理由でgetDraftByIdの結果が無くてもブロックしない(draft-publish.ts参照)
  const draft = await getDraftById(id)

  const body = await req.json().catch(() => ({}))

  const result = buildArticleFromDraft(draft, id, body)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const existing = await getScheduledArticles()
  if (result.article.contentType === "SNAP" && result.article.snapProfile) {
    const duplicate = findDuplicateSnap([...(await getAllArticles()), ...existing.map((item) => ({ ...item, publishedAt: item.scheduledPublishAt }))], result.article.coverImage, result.article.snapProfile)
    if (duplicate) return NextResponse.json({ error: `同じ人物または画像のSNAPが公開・予約済みです: ${duplicate.title}` }, { status: 409 })
  }
  const slot = computeNextSlot(existing.map((a) => a.scheduledPublishAt))

  const scheduled: ScheduledArticle = { ...result.article, scheduledPublishAt: slot.toISOString() }
  await addScheduledArticle(scheduled)
  await removeDraft(id)

  return NextResponse.json({ ok: true, scheduledPublishAt: scheduled.scheduledPublishAt })
}
