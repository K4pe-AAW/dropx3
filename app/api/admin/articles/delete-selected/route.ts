import { NextRequest, NextResponse } from "next/server"
import { readArticles, writeArticles, addDrafts, generateId } from "@/lib/storage"
import type { Draft } from "@/lib/types"

/**
 * チェックした公開済み記事をまとめて非公開にする。単一記事版のDELETE /api/admin/articles/[id]と
 * 同じくハードデリートではなくrejected状態のDraftとしてdrafts.jsonに残す(reversible)。
 * 複数件でもarticles.json/drafts.jsonへの書き込みはそれぞれ1回ずつ(単一トランザクション)。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string")
    : []
  if (ids.length === 0) return NextResponse.json({ error: "idsが空です" }, { status: 400 })

  const idSet = new Set(ids)
  const articlesData = await readArticles()
  const removed = articlesData.articles.filter((a) => idSet.has(a.id))
  if (removed.length === 0) return NextResponse.json({ deleted: 0 })

  articlesData.articles = articlesData.articles.filter((a) => !idSet.has(a.id))
  articlesData.lastUpdated = new Date().toISOString()
  await writeArticles(articlesData)

  const now = new Date().toISOString()
  const rejectedDrafts: Draft[] = removed.map((a) => ({
    id: generateId(`${a.id}-unpublished-${now}`),
    status: "rejected",
    title: a.title,
    excerpt: a.excerpt,
    bodyParagraphs: a.bodyParagraphs,
    category: a.category,
    brands: a.brands,
    tags: a.tags,
    suggestedAffiliateSearch: [],
    sourceRefs: a.sourceRefs,
    createdAt: now,
  }))
  await addDrafts(rejectedDrafts)

  return NextResponse.json({ deleted: removed.length })
}
