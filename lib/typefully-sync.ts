import type { SocialPostDraft, SocialQueueState } from "./social-promotion"

export const TYPEFULLY_SOCIAL_SET_ID = 336958
export const TYPEFULLY_X_USERNAME = "dropx3tokyo"
export const TYPEFULLY_QUEUE_TARGET = 10

type TypefullyDraft = {
  draft_title?: string | null
  status?: string
}

type TypefullyListResponse = {
  results?: TypefullyDraft[]
}

type TypefullyMedia = {
  media_id: string
  upload_url?: string
  status?: string
}

type SyncDependencies = {
  apiKey: string
  fetchImpl?: typeof fetch
  feedUrl?: string
  now?: Date
}

export type TypefullySyncResult = {
  scheduledBefore: number
  created: number
  skippedDuplicate: number
  mediaFallbacks: number
}

const API = "https://api.typefully.com/v2"

function jstDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function draftTitle(candidate: SocialPostDraft): string {
  return `DROP ${candidate.id}`
}

export function sameDayArticleKey(id: string): string | null {
  const match = id.match(/^(.+):(new_article|release_day|article_update):(\d{4}-\d{2}-\d{2})$/)
  return match ? `${match[1]}:${match[3]}` : null
}

function titleId(title?: string | null): string | null {
  return title?.startsWith("DROP ") ? title.slice(5) : null
}

function imageFileName(imageUrl: string): string {
  const path = new URL(imageUrl).pathname
  const name = path.split("/").pop()?.replace(/[^a-zA-Z0-9._()-]/g, "-") || "drop-image.jpg"
  return /\.(?:jpe?g|png|webp|gif)$/i.test(name) ? name : `${name}.jpg`
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function requestJson<T>(fetchImpl: typeof fetch, url: string, apiKey: string, init?: RequestInit): Promise<T> {
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Typefully API ${response.status}: ${body.slice(0, 300)}`)
  }
  return response.json() as Promise<T>
}

async function uploadImage(
  fetchImpl: typeof fetch,
  apiKey: string,
  candidate: SocialPostDraft
): Promise<string | null> {
  try {
    const source = await fetchImpl(candidate.imageUrl)
    if (!source.ok) return null
    const bytes = await source.arrayBuffer()
    const upload = await requestJson<TypefullyMedia>(
      fetchImpl,
      `${API}/social-sets/${TYPEFULLY_SOCIAL_SET_ID}/media/upload`,
      apiKey,
      {
        method: "POST",
        body: JSON.stringify({
          file_name: imageFileName(candidate.imageUrl),
          alt_text: candidate.text.split("\n")[0].slice(0, 300),
        }),
      }
    )
    if (!upload.upload_url) return null
    const uploaded = await fetchImpl(upload.upload_url, { method: "PUT", body: bytes })
    if (!uploaded.ok) return null

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const media = await requestJson<TypefullyMedia>(
        fetchImpl,
        `${API}/social-sets/${TYPEFULLY_SOCIAL_SET_ID}/media/${upload.media_id}`,
        apiKey
      )
      if (media.status === "ready") return upload.media_id
      if (media.status === "failed") return null
      await sleep(500)
    }
  } catch {
    return null
  }
  return null
}

async function listDrafts(fetchImpl: typeof fetch, apiKey: string, status: string): Promise<TypefullyDraft[]> {
  const params = new URLSearchParams({ status, limit: "50", order_by: "-created_at" })
  const data = await requestJson<TypefullyListResponse>(
    fetchImpl,
    `${API}/social-sets/${TYPEFULLY_SOCIAL_SET_ID}/drafts?${params}`,
    apiKey
  )
  return data.results ?? []
}

export async function syncTypefullyX({
  apiKey,
  fetchImpl = fetch,
  feedUrl = "https://dropx3.com/api/social-feed",
  now = new Date(),
}: SyncDependencies): Promise<TypefullySyncResult> {
  if (!apiKey) throw new Error("TYPEFULLY_API_KEY is required")

  const socialSet = await requestJson<{ username?: string }>(
    fetchImpl,
    `${API}/social-sets/${TYPEFULLY_SOCIAL_SET_ID}/`,
    apiKey
  )
  if (socialSet.username !== TYPEFULLY_X_USERNAME) {
    throw new Error(`Typefully social set mismatch: ${socialSet.username ?? "unknown"}`)
  }

  const feedResponse = await fetchImpl(feedUrl, { cache: "no-store" })
  if (!feedResponse.ok) throw new Error(`Social feed ${feedResponse.status}`)
  const feed = (await feedResponse.json()) as SocialQueueState
  if (feed.mode !== "typefully" || !feed.generatedAt) throw new Error("Social feed is not ready for Typefully")
  if (now.getTime() - Date.parse(feed.generatedAt) > 2 * 60 * 60 * 1000) throw new Error("Social feed is stale")

  const [scheduled, publishing, published] = await Promise.all([
    listDrafts(fetchImpl, apiKey, "scheduled"),
    listDrafts(fetchImpl, apiKey, "publishing"),
    listDrafts(fetchImpl, apiKey, "published"),
  ])
  const active = [...scheduled, ...publishing]
  const existing = [...active, ...published]
  const existingIds = new Set(existing.map((item) => titleId(item.draft_title)).filter(Boolean) as string[])
  const existingDayKeys = new Set(
    [...existingIds].map(sameDayArticleKey).filter(Boolean) as string[]
  )
  const today = jstDate(now)
  const candidates = feed.drafts.filter((candidate) => candidate.id.endsWith(`:${today}`))
  const capacity = Math.max(0, TYPEFULLY_QUEUE_TARGET - active.length)
  let created = 0
  let skippedDuplicate = 0
  let mediaFallbacks = 0

  for (const candidate of candidates) {
    if (created >= capacity) break
    const dayKey = sameDayArticleKey(candidate.id)
    if (existingIds.has(candidate.id) || (dayKey && existingDayKeys.has(dayKey))) {
      skippedDuplicate += 1
      continue
    }

    const mediaId = await uploadImage(fetchImpl, apiKey, candidate)
    if (!mediaId) mediaFallbacks += 1
    await requestJson(
      fetchImpl,
      `${API}/social-sets/${TYPEFULLY_SOCIAL_SET_ID}/drafts`,
      apiKey,
      {
        method: "POST",
        body: JSON.stringify({
          draft_title: draftTitle(candidate),
          platforms: {
            x: {
              enabled: true,
              posts: [
                {
                  text: candidate.text,
                  media_ids: mediaId ? [mediaId] : [],
                  hide_link_preview: false,
                },
              ],
            },
          },
          publish_at: "next-free-slot",
          confirm_publish: true,
        }),
      }
    )
    existingIds.add(candidate.id)
    if (dayKey) existingDayKeys.add(dayKey)
    created += 1
  }

  return { scheduledBefore: active.length, created, skippedDuplicate, mediaFallbacks }
}
