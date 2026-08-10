import { NextResponse } from "next/server"
import { readArticles } from "@/lib/storage"

export async function GET() {
  const data = await readArticles()
  const targets = data.articles.filter((a) => a.category === "sneaker" || a.category === "vintage")
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
