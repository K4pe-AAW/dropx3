import { NextRequest, NextResponse } from "next/server"
import { readDrafts, mutateDrafts, getAllArticles } from "@/lib/storage"
import { fetchPageText } from "@/lib/source-watch/fetchers/html"

export const dynamic = "force-dynamic"

/** 一時診断API。「URLから記事を生成」で作られた特定下書きの状態を確認するためだけのもの。確認後に削除する。 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy

  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const action = req.nextUrl.searchParams.get("action")

  // 修正後のimageCandidates抽出が実ページで機能するか(副作用なし、下書きは作らない)
  if (action === "fetch-images") {
    const url = req.nextUrl.searchParams.get("url")
    if (!url) return NextResponse.json({ error: "url必須" }, { status: 400 })
    const page = await fetchPageText(url)
    return NextResponse.json({ page })
  }

  // 修正前に生成済みの下書きへ、カバー画像候補を後から補完する(この1件限りの救済措置)
  if (action === "patch-cover") {
    const id = req.nextUrl.searchParams.get("id")
    const coverUrl = req.nextUrl.searchParams.get("url")
    if (!id || !coverUrl) return NextResponse.json({ error: "id/url必須" }, { status: 400 })
    const result = await mutateDrafts((data) => {
      const target = data.drafts.find((d) => d.id === id)
      if (target) target.suggestedCoverImage = coverUrl
      return data
    })
    return NextResponse.json({ patched: result.drafts.find((d) => d.id === id) ?? null })
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
