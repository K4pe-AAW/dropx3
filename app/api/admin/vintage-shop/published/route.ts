import { NextResponse } from "next/server"
import { getArticlesByCategory } from "@/lib/storage"

/** 投稿済みの古着記事一覧(新しい順、直近20件) */
export async function GET() {
  const articles = await getArticlesByCategory("vintage")
  const items = articles.slice(0, 20).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    coverImage: a.coverImage,
    brands: a.brands,
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
  }))
  return NextResponse.json({ items })
}
