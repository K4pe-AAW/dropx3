import { NextRequest, NextResponse } from "next/server"
import { readArticles, writeArticles, readDrafts, writeDrafts, generateId, generateSlug } from "@/lib/storage"
import type { Article, AffiliateLink, OfficialLink, Category } from "@/lib/types"

type BatchItem = {
  draftId: string
  category: Category
  coverImage: string
  coverImageAlt: string
  affiliateLinks?: AffiliateLink[]
  officialLinks?: OfficialLink[]
}

/**
 * 一時的な一括公開エンドポイント。個別publish APIの連続呼び出しだとBlobの
 * 読み書きが競合し互いの更新を消してしまうため、1回の読み込み・書き込みで
 * 複数下書きをまとめて記事化する。使用後に削除する。
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-password")
  if (!process.env.ADMIN_PASSWORD || secret !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const batchItems: BatchItem[] = Array.isArray(body.items) ? body.items : []
  if (batchItems.length === 0) {
    return NextResponse.json({ error: "items is empty" }, { status: 400 })
  }

  const draftsData = await readDrafts()
  const articlesData = await readArticles()

  const results: { draftId: string; ok: boolean; slug?: string; error?: string }[] = []

  for (const item of batchItems) {
    const draft = draftsData.drafts.find((d) => d.id === item.draftId)
    if (!draft) {
      results.push({ draftId: item.draftId, ok: false, error: "draft not found" })
      continue
    }

    const newId = generateId(`${draft.id}-${Date.now()}-${Math.random()}`)
    const article: Article = {
      id: newId,
      slug: generateSlug(draft.title, newId),
      title: draft.title,
      excerpt: draft.excerpt,
      bodyParagraphs: draft.bodyParagraphs,
      coverImage: item.coverImage,
      coverImageAlt: item.coverImageAlt,
      galleryImages: [],
      category: item.category,
      brands: draft.brands,
      tags: draft.brands.slice(0, 2),
      publishedAt: new Date().toISOString(),
      featured: false,
      affiliateLinks: item.affiliateLinks ?? [],
      officialLinks: item.officialLinks ?? [],
      sourceRefs: draft.sourceRefs,
    }

    articlesData.articles = articlesData.articles.filter((a) => a.id !== article.id)
    articlesData.articles.unshift(article)
    draftsData.drafts = draftsData.drafts.filter((d) => d.id !== draft.id)

    results.push({ draftId: item.draftId, ok: true, slug: article.slug })
  }

  articlesData.lastUpdated = new Date().toISOString()
  await writeArticles(articlesData)
  await writeDrafts(draftsData)

  return NextResponse.json({ results, published: results.filter((r) => r.ok).length })
}
