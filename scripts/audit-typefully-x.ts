const API = "https://api.typefully.com/v2"
const SOCIAL_SET_ID = 336958

type Draft = {
  draft_title?: string | null
  status?: string | null
  scheduled_date?: string | null
  published_at?: string | null
}

type ListResponse = { results?: Draft[] }

function jstMinute(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date)
}

function kindOf(title?: string | null): string {
  return title?.match(/^DROP .+:([a-z_]+):\d{4}-\d{2}-\d{2}$/)?.[1] ?? "unknown"
}

async function list(apiKey: string, status: string, offset = 0): Promise<Draft[]> {
  const params = new URLSearchParams({ status, limit: "50", offset: String(offset), order_by: "-created_at" })
  const response = await fetch(`${API}/social-sets/${SOCIAL_SET_ID}/drafts?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!response.ok) throw new Error(`Typefully API ${response.status}`)
  return ((await response.json()) as ListResponse).results ?? []
}

function collisions(values: Array<string | null | undefined>): string[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    const key = jstMinute(value)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([minute, count]) => `${minute} (${count})`)
}

async function main(): Promise<void> {
  const apiKey = process.env.TYPEFULLY_API_KEY ?? ""
  if (!apiKey) throw new Error("TYPEFULLY_API_KEY is required")
  const [scheduled, publishing, ...publishedPages] = await Promise.all([
    list(apiKey, "scheduled"),
    list(apiKey, "publishing"),
    list(apiKey, "published", 0),
    list(apiKey, "published", 50),
    list(apiKey, "published", 100),
  ])
  const published = publishedPages.flat()
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent = published.filter((item) => Date.parse(item.published_at ?? "") >= cutoff)
  const byKind: Record<string, number> = {}
  for (const item of recent) {
    const kind = kindOf(item.draft_title)
    byKind[kind] = (byKind[kind] ?? 0) + 1
  }
  const active = [...scheduled, ...publishing]
  console.log(JSON.stringify({
    periodDays: 7,
    published: recent.length,
    editorialPublished: recent.filter((item) => kindOf(item.draft_title).startsWith("editorial_")).length,
    newsPublished: recent.filter((item) => !kindOf(item.draft_title).startsWith("editorial_")).length,
    byKind,
    publishedMinuteCollisions: collisions(recent.map((item) => item.published_at)),
    activeScheduled: active.length,
    activeMinuteCollisions: collisions(active.map((item) => item.scheduled_date)),
  }))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Typefully audit failed")
  process.exitCode = 1
})
