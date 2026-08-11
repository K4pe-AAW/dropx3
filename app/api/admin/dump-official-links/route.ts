import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

function isBrandTopUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const segments = u.pathname.split("/").filter(Boolean)
    return segments.length === 0 || (segments.length === 1 && !u.search)
  } catch {
    return true
  }
}

/** TEMP: 8/11監査で指摘した「officialLinksがブランドTOPのみの記事」を洗い出すための一時エンドポイント */
export async function GET() {
  const articles = await getAllArticles()
  const flagged = articles
    .filter((a) => a.officialLinks.length > 0 && a.officialLinks.every((l) => isBrandTopUrl(l.url)))
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      brands: a.brands,
      officialLinks: a.officialLinks,
      excerpt: a.excerpt,
    }))
  return NextResponse.json({ count: flagged.length, total: articles.length, flagged })
}
