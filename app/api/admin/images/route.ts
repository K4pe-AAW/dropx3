import { NextRequest, NextResponse } from "next/server"
import { readArticles, writeArticles } from "@/lib/storage"

// 画像修正の一時ツール。使用後に削除する。
export async function GET() {
  const { articles } = await readArticles()
  const list = articles.map((a) => ({ id: a.id, slug: a.slug, coverImage: a.coverImage }))
  return NextResponse.json({ articles: list, count: list.length })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const updates = body?.updates
  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: "updates must be an array" }, { status: 400 })
  }

  const data = await readArticles()
  const results: { id: string; ok: boolean; error?: string }[] = []

  for (const u of updates) {
    const article = data.articles.find((a) => a.id === u.id)
    if (!article) {
      results.push({ id: u.id, ok: false, error: "article not found" })
      continue
    }
    article.coverImage = u.coverImage
    if (u.coverImageAlt) article.coverImageAlt = u.coverImageAlt
    results.push({ id: u.id, ok: true })
  }

  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)

  return NextResponse.json({ results, updated: results.filter((r) => r.ok).length })
}
