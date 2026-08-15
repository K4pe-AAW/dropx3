import { NextRequest, NextResponse } from "next/server"
import { getDraftById, removeDraft, publishArticle } from "@/lib/storage"
import { buildArticleFromDraft } from "@/lib/draft-publish"
import type { Article } from "@/lib/types"

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

  const article: Article = { ...result.article, publishedAt: new Date().toISOString() }
  await publishArticle(article)
  await removeDraft(draft.id)

  return NextResponse.json({ ok: true, slug: article.slug })
}
