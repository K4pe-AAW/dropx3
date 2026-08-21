import { NextRequest, NextResponse } from "next/server"
import { listSources } from "@/lib/source-watch/storage"
import { crawlSource } from "@/lib/source-watch/crawl"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/** 1ソースだけを指定して巡回し、処理時間の内訳(CrawlLog.durationMs)を見る診断API */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const sourceId = new URL(req.url).searchParams.get("sourceId")
  const sources = await listSources()
  if (!sourceId) {
    return NextResponse.json({
      sources: sources
        .filter((s) => s.enabled && s.monitoringMethod !== "manual")
        .map((s) => ({ id: s.id, name: s.name, method: s.monitoringMethod, imagePolicy: s.imagePolicy })),
    })
  }

  const source = sources.find((s) => s.id === sourceId)
  if (!source) return NextResponse.json({ error: "source not found" }, { status: 404 })

  const startedAt = Date.now()
  const log = await crawlSource(source)
  const totalMs = Date.now() - startedAt

  return NextResponse.json({ totalMs, log })
}
