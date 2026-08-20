import { NextResponse } from "next/server"
import { readDrafts, getAllArticles, mutateDrafts } from "@/lib/storage"
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

/** 下書きのみ一括修正する(公開済み記事は表示への影響を考慮し対象外、個別に確認してから扱う) */
export async function POST() {
  const { drafts } = await readDrafts()
  const targetIds = new Set(findMiscategorized(drafts).map((d) => d.id))

  let fixed = 0
  await mutateDrafts((data) => {
    fixed = 0
    for (const draft of data.drafts) {
      if (targetIds.has(draft.id)) {
        draft.category = "youtube"
        fixed++
      }
    }
    return data
  })

  return NextResponse.json({ fixed })
}
