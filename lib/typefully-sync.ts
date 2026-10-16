import type { SocialPostDraft, SocialQueueState } from "./social-promotion"
import { isApprovedEditorialReview } from "./drop-editorial-review"

export const TYPEFULLY_SOCIAL_SET_ID = 336958
export const TYPEFULLY_X_USERNAME = "dropx3tokyo"
export const TYPEFULLY_QUEUE_TARGET = 5
export const TYPEFULLY_DAILY_SLOTS = [
  { h: 7, m: 30 },
  { h: 11, m: 45 },
  { h: 15, m: 30 },
  { h: 19, m: 0 },
  { h: 21, m: 30 },
] as const

type TypefullyDraft = {
  draft_title?: string | null
  status?: string
  scheduled_date?: string | null
  published_at?: string | null
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
  editorialReady: number
  missingEditorialKinds: string[]
  slotConflicts: number
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
  const match = id.match(/^(.+):([a-z_]+):(\d{4}-\d{2}-\d{2})$/)
  return match ? `${match[1]}:${match[3]}` : null
}

export function isTypefullyCandidateApproved(candidate: SocialPostDraft): boolean {
  if (/^(?:Goss!p|リーク)[・｜]|未確認/.test(candidate.text)) return false
  if (!candidate.kind.startsWith("editorial_")) return true
  return isApprovedEditorialReview(candidate.editorialReview)
}

export function selectTypefullyCandidates(candidates: SocialPostDraft[]): SocialPostDraft[] {
  const approved = candidates.filter(isTypefullyCandidateApproved)
  const editorial = (kind: SocialPostDraft["kind"]) => approved.find((candidate) => candidate.kind === kind)
  const news = approved.filter((candidate) => !candidate.kind.startsWith("editorial_")).slice(0, 2)
  return [
    editorial("editorial_daily_drop"),
    news[0],
    editorial("editorial_spotlight"),
    news[1],
    editorial("editorial_compare"),
  ].filter((candidate): candidate is SocialPostDraft => Boolean(candidate))
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

async function listDrafts(
  fetchImpl: typeof fetch,
  apiKey: string,
  status: string,
  offset = 0
): Promise<TypefullyDraft[]> {
  const params = new URLSearchParams({ status, limit: "50", offset: String(offset), order_by: "-created_at" })
  const data = await requestJson<TypefullyListResponse>(
    fetchImpl,
    `${API}/social-sets/${TYPEFULLY_SOCIAL_SET_ID}/drafts?${params}`,
    apiKey
  )
  return data.results ?? []
}

async function listRecentPublished(fetchImpl: typeof fetch, apiKey: string): Promise<TypefullyDraft[]> {
  const pages = await Promise.all([0, 50, 100].map((offset) => listDrafts(fetchImpl, apiKey, "published", offset)))
  return pages.flat()
}

function jstDateOf(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : jstDate(date)
}

/**
 * Typefully may return equivalent timestamps with or without milliseconds.
 * Compare queue occupancy by JST calendar minute instead of raw ISO strings.
 */
export function jstMinuteKey(value?: string | null): string | null {
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

function articleIdentityKey(id: string): string | null {
  const match = id.match(/^(.+):([a-z_]+):(\d{4}-\d{2}-\d{2})$/)
  if (!match || match[1].startsWith("editorial-")) return null
  return match[1]
}

function slotIso(date: string, slot: (typeof TYPEFULLY_DAILY_SLOTS)[number]): string {
  return new Date(`${date}T${String(slot.h).padStart(2, "0")}:${String(slot.m).padStart(2, "0")}:00+09:00`).toISOString()
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
    listRecentPublished(fetchImpl, apiKey),
  ])
  const active = [...scheduled, ...publishing]
  const existing = [...active, ...published]
  const existingIds = new Set(existing.map((item) => titleId(item.draft_title)).filter(Boolean) as string[])
  const existingDayKeys = new Set(
    [...existingIds].map(sameDayArticleKey).filter(Boolean) as string[]
  )
  const today = jstDate(now)
  const candidates = selectTypefullyCandidates(feed.drafts.filter((candidate) => {
    if (!candidate.id.endsWith(`:${today}`)) return false
    return isTypefullyCandidateApproved(candidate)
  }))
  const requiredEditorialKinds = ["editorial_daily_drop", "editorial_spotlight", "editorial_compare"] as const
  const readyEditorialKinds = new Set(
    candidates.filter((candidate) => candidate.kind.startsWith("editorial_")).map((candidate) => candidate.kind)
  )
  const missingEditorialKinds = requiredEditorialKinds.filter((kind) => !readyEditorialKinds.has(kind))
  const publishedToday = published.filter((item) => jstDateOf(item.published_at) === today).length
  const activeToday = active.filter((item) => jstDateOf(item.scheduled_date) === today)
  const occupiedTimes = new Set(
    [...activeToday.map((item) => item.scheduled_date), ...published
      .filter((item) => jstDateOf(item.published_at) === today)
      .map((item) => item.published_at)]
      .map(jstMinuteKey)
      .filter(Boolean) as string[]
  )
  const availableSlots = TYPEFULLY_DAILY_SLOTS
    .map((slot) => slotIso(today, slot))
    .filter((value) => Date.parse(value) > now.getTime() && !occupiedTimes.has(jstMinuteKey(value) ?? value))
  const capacity = Math.min(
    availableSlots.length,
    Math.max(0, TYPEFULLY_QUEUE_TARGET - publishedToday - activeToday.length)
  )
  const recentCutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000
  const recentArticleKeys = new Set(
    published
      .filter((item) => Date.parse(item.published_at ?? "") >= recentCutoff)
      .map((item) => titleId(item.draft_title))
      .map((id) => id ? articleIdentityKey(id) : null)
      .filter(Boolean) as string[]
  )
  let created = 0
  let skippedDuplicate = 0
  let mediaFallbacks = 0
  let slotConflicts = 0
  let slotCursor = 0

  for (const candidate of candidates) {
    if (created >= capacity) break
    const dayKey = sameDayArticleKey(candidate.id)
    const articleKey = articleIdentityKey(candidate.id)
    if (
      existingIds.has(candidate.id) ||
      (dayKey && existingDayKeys.has(dayKey)) ||
      (articleKey && recentArticleKeys.has(articleKey))
    ) {
      skippedDuplicate += 1
      continue
    }

    let targetSlot: string | undefined
    while (slotCursor < availableSlots.length) {
      const proposedSlot = availableSlots[slotCursor++]
      const targetMinute = jstMinuteKey(proposedSlot)
      // Re-read immediately before creation. This prevents an hourly automation and a
      // manual recovery run from assigning two posts to the same Typefully minute.
      const [latestScheduled, latestPublishing] = await Promise.all([
        listDrafts(fetchImpl, apiKey, "scheduled"),
        listDrafts(fetchImpl, apiKey, "publishing"),
      ])
      const latestActive = [...latestScheduled, ...latestPublishing]
      const latestIds = new Set(latestActive.map((item) => titleId(item.draft_title)).filter(Boolean) as string[])
      if (latestIds.has(candidate.id)) {
        skippedDuplicate += 1
        break
      }
      if (latestActive.some((item) => jstMinuteKey(item.scheduled_date) === targetMinute)) {
        slotConflicts += 1
        continue
      }
      targetSlot = proposedSlot
      break
    }
    if (!targetSlot) continue

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
          publish_at: targetSlot,
          confirm_publish: true,
        }),
      }
    )
    existingIds.add(candidate.id)
    if (dayKey) existingDayKeys.add(dayKey)
    if (articleKey) recentArticleKeys.add(articleKey)
    created += 1
  }

  return {
    scheduledBefore: active.length,
    created,
    skippedDuplicate,
    mediaFallbacks,
    editorialReady: readyEditorialKinds.size,
    missingEditorialKinds,
    slotConflicts,
  }
}
