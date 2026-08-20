import { NextResponse } from "next/server"
import { readDrafts, getAllArticles, mutateDrafts, mutateArticles } from "@/lib/storage"
import { extractYoutubeVideoId } from "@/lib/ai-draft"

export const dynamic = "force-dynamic"

/** sourceRefsに実際のYouTube動画URLがあるのにcategory!=="youtube"になっている下書き・記事を検出する */
function findMiscategorized<T extends { category: string; sourceRefs: { url: string }[] }>(items: T[]): T[] {
  return items.filter((item) => item.category !== "youtube" && item.sourceRefs.some((r) => extractYoutubeVideoId(r.url)))
}

export async function GET() {
  const [{ drafts }, articles] = await Promise.all([readDrafts(), getAllArticles()])

  const draftHits = findMiscategorized(drafts).map((d) => ({ id: d.id, title: d.title, category: d.category, sourceRefs: d.sourceRefs }))
  const articleHits = findMiscategorized(articles).map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    category: a.category,
    sourceRefs: a.sourceRefs,
  }))

  return NextResponse.json({ draftHits, articleHits })
}

/** targetがtrueなら下書き・記事の両方、指定が無ければ下書きのみ一括修正する */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const includeArticles = body?.includeArticles === true

  const { drafts } = await readDrafts()
  const draftTargetIds = new Set(findMiscategorized(drafts).map((d) => d.id))

  let fixedDrafts = 0
  await mutateDrafts((data) => {
    fixedDrafts = 0
    for (const draft of data.drafts) {
      if (draftTargetIds.has(draft.id)) {
        draft.category = "youtube"
        fixedDrafts++
      }
    }
    return data
  })

  let fixedArticles = 0
  if (includeArticles) {
    const articles = await getAllArticles()
    const articleTargetIds = new Set(findMiscategorized(articles).map((a) => a.id))
    await mutateArticles((data) => {
      fixedArticles = 0
      for (const article of data.articles) {
        if (articleTargetIds.has(article.id)) {
          article.category = "youtube"
          fixedArticles++
        }
      }
      return data
    })
  }

  return NextResponse.json({ fixedDrafts, fixedArticles })
}
