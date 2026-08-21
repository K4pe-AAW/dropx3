import { NextRequest, NextResponse } from "next/server"
import { readDrafts, getAllArticles } from "@/lib/storage"

export const dynamic = "force-dynamic"

/** 一時診断API。「URLから記事を生成」で作られた特定下書きの状態を確認するためだけのもの。確認後に削除する。 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy

  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const targetId = req.nextUrl.searchParams.get("id") ?? "b9277501fa7841b9a97b31f0dc9a2601"

  const [{ drafts }, articles] = await Promise.all([readDrafts(), getAllArticles()])
  const draft = drafts.find((d) => d.id === targetId)
  const article = articles.find((a) => a.id === targetId)

  return NextResponse.json({
    totalDrafts: drafts.length,
    foundInDrafts: Boolean(draft),
    foundInArticles: Boolean(article),
    recentDraftIds: drafts.slice(0, 5).map((d) => ({ id: d.id, title: d.title, createdAt: d.createdAt })),
    draft: draft
      ? {
          id: draft.id,
          status: draft.status,
          title: draft.title,
          titleLen: draft.title?.length ?? 0,
          bodyParagraphCount: draft.bodyParagraphs?.length ?? 0,
          bodyParagraphsSample: draft.bodyParagraphs?.slice(0, 2),
          sourceRefs: draft.sourceRefs,
          sourcePublishedAt: draft.sourcePublishedAt,
          suggestedCoverImage: draft.suggestedCoverImage,
          suggestedGalleryImagesCount: draft.suggestedGalleryImages?.length ?? 0,
          suggestedColorways: draft.suggestedColorways,
          suggestedYoutubeVideoId: draft.suggestedYoutubeVideoId,
          createdAt: draft.createdAt,
        }
      : null,
    article: article ? { id: article.id, slug: article.slug, title: article.title } : null,
  })
}
