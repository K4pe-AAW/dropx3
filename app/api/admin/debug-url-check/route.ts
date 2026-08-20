import { NextResponse } from "next/server"
import { readDrafts, getAllArticles } from "@/lib/storage"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url")
  if (!url) return NextResponse.json({ error: "url query param required" }, { status: 400 })

  const [{ drafts }, articles] = await Promise.all([readDrafts(), getAllArticles()])

  const matchedDrafts = drafts
    .filter((d) => d.sourceRefs.some((r) => r.url === url))
    .map((d) => ({ id: d.id, title: d.title, status: d.status, category: d.category, brands: d.brands, sourceRefs: d.sourceRefs }))
  const matchedArticles = articles
    .filter((a) => a.sourceRefs.some((r) => r.url === url))
    .map((a) => ({ id: a.id, title: a.title, slug: a.slug, category: a.category, brands: a.brands, sourceRefs: a.sourceRefs }))

  return NextResponse.json({ matchedDrafts, matchedArticles })
}
