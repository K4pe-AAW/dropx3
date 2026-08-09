import { NextResponse } from "next/server"
import { readArticles } from "@/lib/storage"

// 診断用の一時ツール。使用後に削除する。
export async function GET() {
  const { articles } = await readArticles()
  const list = articles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    category: a.category,
    brands: a.brands,
    officialLinks: a.officialLinks,
    affiliateLinks: a.affiliateLinks,
  }))
  return NextResponse.json({ articles: list, count: list.length })
}
