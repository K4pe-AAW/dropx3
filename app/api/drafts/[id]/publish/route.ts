import { NextRequest, NextResponse } from "next/server"
import { getDraftById, removeDraft, publishArticle } from "@/lib/storage"
import { buildArticleFromDraft } from "@/lib/draft-publish"
import type { Article } from "@/lib/types"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // 生成直後にすぐ公開しようとすると、Blobの書き込み伝播遅延でgetDraftByIdが見つけられないことが
  // ある(2026-08-22に実際に報告あり)。PublishFormは編集可能な全項目を既にリクエストボディへ
  // 含めて送ってくるため、draftはbuildArticleFromDraft内のフォールバックとしてのみ使い、
  // 見つからなくても公開自体はブロックしない。
  const draft = await getDraftById(id)

  const body = await req.json().catch(() => ({}))
  const result = buildArticleFromDraft(draft, id, body)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const article: Article = { ...result.article, publishedAt: new Date().toISOString() }
  await publishArticle(article)
  await removeDraft(id)

  return NextResponse.json({ ok: true, slug: article.slug })
}
