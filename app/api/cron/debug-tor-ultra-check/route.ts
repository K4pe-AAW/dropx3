import { NextRequest, NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

export const dynamic = "force-dynamic"

/** 一時診断API。tor-ultra-lo記事のSEO改善のため現状把握用。確認後に削除する。 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
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
