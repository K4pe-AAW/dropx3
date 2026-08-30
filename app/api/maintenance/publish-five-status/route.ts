import { NextResponse } from "next/server"
import { readJson } from "@/lib/storage"

export const dynamic = "force-dynamic"

type State = { runs?: Record<string, { publishedArticleIds?: string[]; titles?: string[] }> }

export async function GET() {
  const state = await readJson<State>("data/daily-auto-publish-state.json", { runs: {} })
  const run = state.runs?.["2099-01-02-08"]
  if (!run?.publishedArticleIds) return NextResponse.json({ completed: false })
  return NextResponse.json({
    completed: true,
    publishedCount: run.publishedArticleIds.length,
    titles: run.titles ?? [],
  })
}
