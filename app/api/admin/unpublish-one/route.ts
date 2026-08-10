import { NextResponse } from "next/server"
import { readArticles, writeArticles, readDrafts, writeDrafts } from "@/lib/storage"
import type { Draft } from "@/lib/types"

// 重複記事1件を非公開化(rejected draftへ変換、完全削除はしない)するための一時API
const TARGET_ARTICLE_ID = "edc0e6fa587430111593573b31a5ae61"
const REASON = "同一商品(Air Jordan 6 Retro Oreo)の重複記事のため、情報量の多いe675224c側を残して非公開化"

export async function POST() {
  const articlesData = await readArticles()
  const article = articlesData.articles.find((a) => a.id === TARGET_ARTICLE_ID)
  if (!article) {
    return NextResponse.json({ error: "article not found (already unpublished?)" }, { status: 404 })
  }

  articlesData.articles = articlesData.articles.filter((a) => a.id !== TARGET_ARTICLE_ID)
  articlesData.lastUpdated = new Date().toISOString()
  await writeArticles(articlesData)

  const draft: Draft = {
    id: article.id,
    status: "rejected",
    title: article.title,
    excerpt: `[非公開化: ${REASON}] ${article.excerpt}`,
    bodyParagraphs: article.bodyParagraphs,
    category: article.category,
    brands: article.brands,
    tags: article.tags,
    suggestedAffiliateSearch: [],
    sourceRefs: article.sourceRefs,
    createdAt: new Date().toISOString(),
  }
  const draftsData = await readDrafts()
  draftsData.drafts.unshift(draft)
  await writeDrafts(draftsData)

  return NextResponse.json({ ok: true, unpublishedSlug: article.slug })
}
