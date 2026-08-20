import { NextResponse } from "next/server"
import { readDrafts, getAllArticles } from "@/lib/storage"
import { extractYoutubeVideoId } from "@/lib/ai-draft"

export const dynamic = "force-dynamic"

/** category="youtube"なのに、sourceRefsのどれもYouTube動画URLでないもの(=AIの誤判定)を洗い出す */
export async function GET() {
  const [{ drafts }, articles] = await Promise.all([readDrafts(), getAllArticles()])

  const isMiscategorized = (sourceRefs: { name: string; url: string }[]) =>
    !sourceRefs.some((r) => extractYoutubeVideoId(r.url))

  const draftHits = drafts
    .filter((d) => d.category === "youtube" && isMiscategorized(d.sourceRefs))
    .map((d) => ({ id: d.id, title: d.title, sourceRefs: d.sourceRefs }))

  const articleHits = articles
    .filter((a) => a.category === "youtube" && isMiscategorized(a.sourceRefs))
    .map((a) => ({ id: a.id, title: a.title, slug: a.slug, sourceRefs: a.sourceRefs }))

  const draftYoutubeTotal = drafts.filter((d) => d.category === "youtube").length
  const articleYoutubeTotal = articles.filter((a) => a.category === "youtube").length

  return NextResponse.json({
    draftYoutubeTotal,
    draftMiscategorized: draftHits.length,
    draftHits,
    articleYoutubeTotal,
    articleMiscategorized: articleHits.length,
    articleHits,
  })
}
