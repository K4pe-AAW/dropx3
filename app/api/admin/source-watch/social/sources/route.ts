import { NextRequest, NextResponse } from "next/server"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { addSource } from "@/lib/source-watch/storage"
import { generateId } from "@/lib/storage"
import { SOCIAL_TOPICS } from "@/lib/source-watch/labels"
import { DEFAULT_SOURCE_SCORE_BY_SOCIAL_TYPE } from "@/lib/source-watch/types"
import type { Source, SocialPlatform, SocialPriority, SocialSourceType } from "@/lib/source-watch/types"

const SOCIAL_SOURCE_TYPES: SocialSourceType[] = ["official_brand", "official_artist", "official_event", "official_store", "media", "collector", "unknown"]
const SOCIAL_PRIORITIES: SocialPriority[] = ["S", "A", "B", "C"]
const SOCIAL_PLATFORMS: SocialPlatform[] = ["instagram", "x", "threads", "youtube", "tiktok"]

function parseHandle(profileUrl: string): string | null {
  try {
    const u = new URL(profileUrl)
    const segments = u.pathname.split("/").filter(Boolean)
    return segments[0] ?? null
  } catch {
    return null
  }
}

/** 管理画面の「Instagramアカウントを追加」。FOLLOW機能: URL入力→カテゴリ選択→Priority→監視開始まで1リクエストで完結させる */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })

  const profileUrl = typeof body.profileUrl === "string" ? body.profileUrl.trim() : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (!profileUrl || !isSafeExternalUrl(profileUrl)) return NextResponse.json({ error: "有効なプロフィールURLを入力してください" }, { status: 400 })
  if (!name) return NextResponse.json({ error: "アカウント名を入力してください" }, { status: 400 })

  const platform: SocialPlatform = SOCIAL_PLATFORMS.includes(body.platform) ? body.platform : "instagram"
  const socialType: SocialSourceType = SOCIAL_SOURCE_TYPES.includes(body.socialType) ? body.socialType : "unknown"
  const priority: SocialPriority = SOCIAL_PRIORITIES.includes(body.priority) ? body.priority : "B"
  const topics: string[] = Array.isArray(body.topics) ? body.topics.filter((t: unknown) => typeof t === "string" && (SOCIAL_TOPICS as readonly string[]).includes(t)) : []

  const handle = parseHandle(profileUrl)
  const id = `social-${platform}-${handle ?? generateId(profileUrl).slice(0, 12)}`
  const now = new Date().toISOString()

  const source: Source = {
    id,
    name,
    url: profileUrl,
    category: "social",
    sourceScore: DEFAULT_SOURCE_SCORE_BY_SOCIAL_TYPE[socialType],
    monitoringMethod: "manual",
    monitoringIntervalMinutes: 1440,
    enabled: true,
    imagePolicy: "embed_only",
    platform,
    handle: handle ?? undefined,
    socialType,
    priority,
    topics,
    createdAt: now,
    updatedAt: now,
  }

  try {
    const created = await addSource(source)
    return NextResponse.json(created)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "追加に失敗しました(既に登録済みの可能性があります)" }, { status: 409 })
  }
}
