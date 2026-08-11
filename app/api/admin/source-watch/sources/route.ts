import { NextResponse } from "next/server"
import { listSources, seedSourcesIfMissing, getLatestCrawlLog } from "@/lib/source-watch/storage"
import { INITIAL_SOURCES } from "@/lib/source-watch/seed-sources"

export async function GET() {
  try {
    await seedSourcesIfMissing(INITIAL_SOURCES)
  } catch {
    // ビルド時の静的解析パス等、書き込みができないタイミングで呼ばれた場合はスキップする(次回実リクエストで再試行)
  }
  const sources = await listSources()
  const withLogs = await Promise.all(
    sources.map(async (s) => ({ ...s, latestCrawlLog: await getLatestCrawlLog(s.id) }))
  )
  return NextResponse.json({ sources: withLogs })
}
