import { NextRequest, NextResponse } from "next/server"
import { getAllArticles, mutateArticles } from "@/lib/storage"

export const dynamic = "force-dynamic"

/** 一時診断API。tor-ultra-lo記事のSEO改善(内部リンク追加)のため現状把握・適用用。確認後に削除する。 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const action = req.nextUrl.searchParams.get("action")

  if (action === "add-related-link") {
    const fromId = req.nextUrl.searchParams.get("fromId")
    const toId = req.nextUrl.searchParams.get("toId")
    const note = req.nextUrl.searchParams.get("note") ?? undefined
    if (!fromId || !toId) return NextResponse.json({ error: "fromId/toId必須" }, { status: 400 })

    const result = await mutateArticles((data) => {
      const from = data.articles.find((a) => a.id === fromId)
      const to = data.articles.find((a) => a.id === toId)
      if (!from || !to) return data
      const already = (from.relatedArticles ?? []).some((r) => r.slug === to.slug)
      if (already) return data
      from.relatedArticles = [...(from.relatedArticles ?? []), { title: to.title, slug: to.slug, ...(note ? { note } : {}) }]
      return data
    })
    const updated = result.articles.find((a) => a.id === fromId)
    return NextResponse.json({ relatedArticles: updated?.relatedArticles ?? [] })
  }

  const articles = await getAllArticles()
  const target = articles.find((a) => a.slug.includes("tor-ultra-lo"))
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 })

  // 内部リンクの機会を探すため、同ブランド・同カテゴリの他記事も一覧化する
  const related = articles
    .filter((a) => a.id !== target.id && (a.brands.includes("HOKA") || a.category === target.category))
    .map((a) => ({ id: a.id, slug: a.slug, title: a.title, brands: a.brands, category: a.category }))

  return NextResponse.json({ target, totalArticles: articles.length, relatedCandidates: related.slice(0, 20) })
}
