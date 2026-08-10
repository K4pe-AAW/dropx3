import { NextResponse } from "next/server"
import { readArticles } from "@/lib/storage"

export async function GET() {
  const data = await readArticles()
  return NextResponse.json(
    data.articles.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      category: a.category,
      brands: a.brands,
      affiliateLinks: a.affiliateLinks,
      officialLinks: a.officialLinks,
      sourceRefs: a.sourceRefs,
      coverImage: a.coverImage,
    }))
  )
}
