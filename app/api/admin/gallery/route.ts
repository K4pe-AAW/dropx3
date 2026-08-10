import { NextRequest, NextResponse } from "next/server"
import { readArticles, writeArticles } from "@/lib/storage"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const updates = body?.updates
  if (!Array.isArray(updates)) return NextResponse.json({ error: "updates must be an array" }, { status: 400 })

  const data = await readArticles()
  const results = []
  for (const u of updates) {
    const article = data.articles.find((a) => a.id === u.id || a.slug.endsWith(u.id))
    if (!article) {
      results.push({ id: u.id, ok: false, error: "article not found" })
      continue
    }
    article.galleryImages = u.galleryImages
    results.push({ id: u.id, ok: true })
  }
  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)
  return NextResponse.json({ results, updated: results.filter((r) => r.ok).length })
}
