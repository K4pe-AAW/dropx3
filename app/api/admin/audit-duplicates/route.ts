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
}

function jaccardWords(a: string, b: string): number {
  const toSet = (s: string) => new Set(s.replace(/[「」『』！？!?×&\s]/g, " ").split(/\s+/).filter(Boolean))
  const setA = toSet(a)
  const setB = toSet(b)
  const inter = [...setA].filter((w) => setB.has(w)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : inter / union
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
    })),
    ...drafts.map((d) => ({
      origin: "draft" as const,
      id: d.id,
      title: d.title,
      category: d.category,
      brands: d.brands,
      publishedAt: d.createdAt,
      sourceUrls: d.sourceRefs.map((r) => r.url),
    })),
  ]

  const candidates: { a: Item; b: Item; titleSim: number; sameBrand: boolean; hoursApart: number }[] = []

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      const sameBrand = a.brands.length > 0 && a.brands.some((x) => b.brands.includes(x))
      if (!sameBrand) continue
      const hoursApart = Math.abs(new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()) / 3600000
      if (hoursApart > 72) continue
      const titleSim = jaccardWords(a.title, b.title)
      if (titleSim < 0.15) continue
      candidates.push({ a, b, titleSim, sameBrand, hoursApart: Math.round(hoursApart * 10) / 10 })
    }
  }

  candidates.sort((x, y) => y.titleSim - x.titleSim)

  return NextResponse.json({
    totalArticles: articles.length,
    totalDrafts: drafts.length,
    candidateCount: candidates.length,
    candidates: candidates.map((c) => ({
      titleSim: Math.round(c.titleSim * 100) / 100,
      hoursApart: c.hoursApart,
      a: { origin: c.a.origin, id: c.a.id, title: c.a.title, brands: c.a.brands, sourceUrls: c.a.sourceUrls },
      b: { origin: c.b.origin, id: c.b.id, title: c.b.title, brands: c.b.brands, sourceUrls: c.b.sourceUrls },
    })),
  })
}
