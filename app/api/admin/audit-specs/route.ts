import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

export async function GET() {
  const articles = await getAllArticles()
  const withSpecs = articles
    .filter((a) => a.bodyParagraphs.some((p) => p.includes("[アイテム情報]")))
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      publishedAt: a.publishedAt,
      bodyParagraphs: a.bodyParagraphs,
      sourceRefs: a.sourceRefs,
    }))
  return NextResponse.json({ count: withSpecs.length, articles: withSpecs })
}
