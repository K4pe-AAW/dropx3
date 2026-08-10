import { NextResponse } from "next/server"
import { readArticles, writeArticles } from "@/lib/storage"
import { canonicalBrandNames } from "@/lib/brands"

export async function POST() {
  const data = await readArticles()
  const changed: { id: string; slug: string; before: string[]; after: string[] }[] = []

  for (const article of data.articles) {
    const after = canonicalBrandNames(article.brands)
    const before = article.brands
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changed.push({ id: article.id, slug: article.slug, before, after })
      article.brands = after
    }
  }

  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)

  return NextResponse.json({ ok: true, changedCount: changed.length, changed })
}
