import { NextRequest, NextResponse } from "next/server"
import { addDrafts, generateId } from "@/lib/storage"
import type { Draft } from "@/lib/types"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const items = body?.drafts
  if (!Array.isArray(items)) return NextResponse.json({ error: "drafts must be an array" }, { status: 400 })

  const now = new Date().toISOString()
  const drafts: Draft[] = items.map((d, i) => ({
    id: generateId(`${d.title}-${Date.now()}-${i}`),
    status: "pending",
    title: d.title,
    excerpt: d.excerpt,
    bodyParagraphs: d.bodyParagraphs,
    category: d.category,
    brands: d.brands,
    tags: d.tags,
    suggestedAffiliateSearch: [],
    sourceRefs: d.sourceRefs,
    createdAt: now,
  }))

  const result = await addDrafts(drafts)
  return NextResponse.json({ ...result, ids: drafts.map((d) => d.id) })
}
