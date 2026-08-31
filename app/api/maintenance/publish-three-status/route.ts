import { NextResponse } from "next/server"
import { readJson } from "@/lib/storage"

export const dynamic = "force-dynamic"

type State = { runs?: Record<string, { publishedArticleIds?: string[]; titles?: string[] }> }

export async function GET() {
  const state = await readJson<State>("data/daily-auto-publish-state.json", { runs: {} })
  const firstRun = state.runs?.["2099-01-04-08"]
  const secondRun = state.runs?.["2099-01-05-08"]
  const thirdRun = state.runs?.["2099-01-06-08"]
  if (!thirdRun?.publishedArticleIds) {
    const titles = [...(firstRun?.titles ?? []), ...(secondRun?.titles ?? [])]
    return NextResponse.json({
      completed: false,
      publishedCount: titles.length,
      titles,
    })
  }
  const titles = [...(firstRun?.titles ?? []), ...(secondRun?.titles ?? []), ...(thirdRun.titles ?? [])]
  return NextResponse.json({
    completed: true,
    publishedCount: titles.length,
    titles,
  })
}
