import { NextRequest, NextResponse } from "next/server"
import { getDraftById, removeDraft, addScheduledArticle, getScheduledArticles } from "@/lib/storage"
import { buildArticleFromDraft } from "@/lib/draft-publish"
import { computeNextSlot } from "@/lib/publish-schedule"
import type { ScheduledArticle } from "@/lib/types"

/**
 * 8,10,...,22時(JST)・各枠2件という固定ペースの「次に空いている枠」を自動計算して予約する。
 * /api/drafts/[id]/scheduleと違い時刻はクライアントから受け取らずサーバー側で決める。
 * 内容のバリデーション・レビューはこれまで通り(publish/scheduleと同じbuildArticleFromDraftを通す)。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const draft = await getDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "下書きが見つかりません" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))

  const result = buildArticleFromDraft(draft, body)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const existing = await getScheduledArticles()
  const slot = computeNextSlot(existing.map((a) => a.scheduledPublishAt))

  const scheduled: ScheduledArticle = { ...result.article, scheduledPublishAt: slot.toISOString() }
  await addScheduledArticle(scheduled)
  await removeDraft(draft.id)

  return NextResponse.json({ ok: true, scheduledPublishAt: scheduled.scheduledPublishAt })
}
