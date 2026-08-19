import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

export async function GET() {
  const articles = await getAllArticles()
  const counts = new Map<string, number>()
  for (const a of articles) for (const b of a.brands) counts.set(b, (counts.get(b) ?? 0) + 1)

  const byLower = new Map<string, string[]>()
  for (const name of counts.keys()) {
    const key = name.toLowerCase().replace(/[\s　]+/g, "")
    byLower.set(key, [...(byLower.get(key) ?? []), name])
  }

  const exactDupes = Array.from(byLower.values()).filter((v) => v.length > 1)

  return NextResponse.json({
    totalUniqueBrands: counts.size,
    all: Array.from(counts.entries()).sort((a, b) => b[1] - a[1]),
    possibleDuplicates: exactDupes,
  })
}
