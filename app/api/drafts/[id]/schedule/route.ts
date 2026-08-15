import { NextRequest, NextResponse } from "next/server"
import { getDraftById, removeDraft, addScheduledArticle } from "@/lib/storage"
import { buildArticleFromDraft } from "@/lib/draft-publish"
import type { ScheduledArticle } from "@/lib/types"

/**
 * publishと同じ内容チェックを経た上で、articles.jsonには入れずscheduled.jsonへ置く
 * (公開日時が来るまでpromoteDueScheduledArticles経由のcronでしか公開されない)。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const draft = await getDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "下書きが見つかりません" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))

  const scheduledPublishAtInput = typeof body.scheduledPublishAt === "string" ? body.scheduledPublishAt : ""
  const scheduledDate = new Date(scheduledPublishAtInput)
  if (!scheduledPublishAtInput || Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: "公開日時が不正です" }, { status: 400 })
  }
  if (scheduledDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: "公開日時は未来の時刻を指定してください" }, { status: 400 })
  }

  const result = buildArticleFromDraft(draft, body)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const scheduled: ScheduledArticle = { ...result.article, scheduledPublishAt: scheduledDate.toISOString() }
  await addScheduledArticle(scheduled)
  await removeDraft(draft.id)

  return NextResponse.json({ ok: true, scheduledPublishAt: scheduled.scheduledPublishAt })
}
