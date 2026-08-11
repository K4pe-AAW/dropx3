import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

/** TEMP: 確度(CONFIRMED/REPORTED/RUMOR)監査のため全記事の要点をダンプする一時エンドポイント */
export async function GET() {
  const articles = await getAllArticles()
  const dump = articles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    publishedAt: a.publishedAt,
    brands: a.brands,
    category: a.category,
    sourceRefs: a.sourceRefs,
    bodyPreview: a.bodyParagraphs.join(" ").slice(0, 400),
  }))
  return NextResponse.json({ count: dump.length, articles: dump })
}
