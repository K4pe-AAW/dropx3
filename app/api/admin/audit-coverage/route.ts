import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

export async function GET() {
  const articles = await getAllArticles()
  const noAffiliateLinks = articles
    .filter((a) => !a.affiliateLinks || a.affiliateLinks.length === 0)
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      category: a.category,
      brands: a.brands,
      excerpt: a.excerpt,
    }))

  return NextResponse.json({ count: noAffiliateLinks.length, articles: noAffiliateLinks })
}
