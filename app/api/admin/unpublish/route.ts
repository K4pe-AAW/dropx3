import { NextRequest, NextResponse } from "next/server"
import { readArticles, writeArticles, readDrafts, writeDrafts } from "@/lib/storage"
import type { Draft } from "@/lib/types"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const ids: string[] = body?.ids
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids must be an array" }, { status: 400 })

  const articlesData = await readArticles()
  const draftsData = await readDrafts()
  const results = []

  for (const id of ids) {
    const article = articlesData.articles.find((a) => a.id === id)
    if (!article) {
      results.push({ id, ok: false, error: "article not found" })
      continue
    }
    const draft: Draft = {
      id: article.id,
      status: "rejected",
      title: article.title,
      excerpt: article.excerpt,
      bodyParagraphs: article.bodyParagraphs,
      category: article.category,
      brands: article.brands,
      tags: article.tags,
      suggestedAffiliateSearch: [],
      sourceRefs: article.sourceRefs,
      createdAt: article.publishedAt,
    }
    draftsData.drafts.unshift(draft)
    articlesData.articles = articlesData.articles.filter((a) => a.id !== id)
    results.push({ id, ok: true })
  }

  articlesData.lastUpdated = new Date().toISOString()
  await writeArticles(articlesData)
  await writeDrafts(draftsData)
  return NextResponse.json({ results, unpublished: results.filter((r) => r.ok).length })
}
