import { NextResponse } from "next/server"
import { getAllArticles, readDrafts } from "@/lib/storage"

type Item = {
  origin: "article" | "draft"
  id: string
  title: string
  category: string
  brands: string[]
  publishedAt: string
  sourceUrls: string[]
  bodyParagraphs: string[]
}

export async function GET() {
  const articles = await getAllArticles()
  const drafts = (await readDrafts()).drafts

  const items: Item[] = [
    ...articles.map((a) => ({
      origin: "article" as const,
      id: a.id,
      title: a.title,
      category: a.category,
      brands: a.brands,
      publishedAt: a.publishedAt,
      sourceUrls: a.sourceRefs.map((r) => r.url),
      bodyParagraphs: a.bodyParagraphs,
    })),
    ...drafts.map((d) => ({
      origin: "draft" as const,
      id: d.id,
      title: d.title,
      category: d.category,
      brands: d.brands,
      publishedAt: d.createdAt,
      sourceUrls: d.sourceRefs.map((r) => r.url),
      bodyParagraphs: d.bodyParagraphs,
    })),
  ]

  const byTitle = new Map<string, Item[]>()
  for (const item of items) {
    byTitle.set(item.title, [...(byTitle.get(item.title) ?? []), item])
  }

  const exactDupeGroups = Array.from(byTitle.entries()).filter(([, group]) => group.length > 1)

  return NextResponse.json({
    groupCount: exactDupeGroups.length,
    groups: exactDupeGroups.map(([title, group]) => ({ title, items: group })),
  })
}
