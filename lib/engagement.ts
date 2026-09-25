import { list, put } from "@vercel/blob"

export type EngagementEventName = "article_view" | "article_read_complete" | "affiliate_click"

const CACHE_MS = 5 * 60 * 1000
let scoreCache: { key: string; expiresAt: number; scores: Map<string, number> } | null = null

function dayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(date)
}

function recentDayKeys(days: number, now = new Date()): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() - index)
    return dayKey(date)
  })
}

/** 競合する集計JSONを上書きせず、1イベント=1小Blobとして追記する。 */
export async function recordEngagement(articleId: string, event: EngagementEventName): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return
  await put(`engagement/${dayKey()}/${articleId}--${event}.json`, "", {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: true,
    cacheControlMaxAge: 60,
  })
  scoreCache = null
}

async function listAll(prefix: string): Promise<string[]> {
  const paths: string[] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix, cursor, limit: 1000 })
    paths.push(...page.blobs.map((blob) => blob.pathname))
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return paths
}

/** 直近7日を基本に、読了と購入行動を単純PVより強く評価する。 */
export async function getEngagementScores(days = 7): Promise<Map<string, number>> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return new Map()
  const keys = recentDayKeys(days)
  const cacheKey = keys.join(",")
  if (scoreCache?.key === cacheKey && scoreCache.expiresAt > Date.now()) return scoreCache.scores

  const paths = (await Promise.all(keys.map((key) => listAll(`engagement/${key}/`)))).flat()
  const scores = new Map<string, number>()
  for (const pathname of paths) {
    const filename = pathname.split("/").pop() ?? ""
    const match = filename.match(/^(.+?)--(article_view|article_read_complete|affiliate_click)(?:-|\.)/)
    if (!match) continue
    const [, articleId, event] = match
    const weight = event === "affiliate_click" ? 5 : event === "article_read_complete" ? 3 : 1
    scores.set(articleId, (scores.get(articleId) ?? 0) + weight)
  }
  scoreCache = { key: cacheKey, expiresAt: Date.now() + CACHE_MS, scores }
  return scores
}
