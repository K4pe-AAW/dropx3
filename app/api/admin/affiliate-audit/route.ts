import { NextRequest, NextResponse } from "next/server"
import { readArticles } from "@/lib/storage"

export async function GET(req: NextRequest) {
  const data = await readArticles()
  const all = req.nextUrl.searchParams.get("all") === "1"
  const targets = all
    ? data.articles
    : data.articles.filter((a) => a.category === "sneaker" || a.category === "vintage")
  return NextResponse.json(
    targets.map((a) => ({
      id: a.id,
      slug: a.slug,
      category: a.category,
      title: a.title,
      affiliateLinks: a.affiliateLinks,
    }))
  )
}
