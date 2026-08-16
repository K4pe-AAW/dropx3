import { NextRequest, NextResponse } from "next/server"
import { getSource, updateSource, removeSource } from "@/lib/source-watch/storage"
import { isSafeExternalUrl } from "@/lib/affiliate"
import type { ImagePolicy, MonitoringMethod, SocialPriority, Source } from "@/lib/source-watch/types"

const MONITORING_METHODS: MonitoringMethod[] = ["rss", "sitemap", "html", "api", "manual"]
const IMAGE_POLICIES: ImagePolicy[] = ["press_assets_available", "affiliate_assets", "embed_only", "unknown", "do_not_use"]
const SOCIAL_PRIORITIES: SocialPriority[] = ["S", "A", "B", "C"]

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const source = await getSource(id)
  if (!source) return NextResponse.json({ error: "ソースが見つかりません" }, { status: 404 })
  return NextResponse.json(source)
}

/** 管理画面からの編集: ON/OFF・巡回頻度・信頼度・取得方法・画像利用ポリシー・URLを変更する */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await getSource(id)
  if (!existing) return NextResponse.json({ error: "ソースが見つかりません" }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })

  const patch: Partial<Omit<Source, "id" | "createdAt">> = {}

  if (typeof body.url === "string") {
    const trimmed = body.url.trim()
    if (trimmed && !isSafeExternalUrl(trimmed)) return NextResponse.json({ error: "urlが不正です" }, { status: 400 })
    patch.url = trimmed || undefined
  }
  if (typeof body.feedUrl === "string") {
    const trimmed = body.feedUrl.trim()
    if (trimmed && !isSafeExternalUrl(trimmed)) return NextResponse.json({ error: "feedUrlが不正です" }, { status: 400 })
    patch.feedUrl = trimmed || undefined
  }
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled
  if (typeof body.sourceScore === "number" && body.sourceScore >= 0 && body.sourceScore <= 100) {
    patch.sourceScore = body.sourceScore
  }
  if (typeof body.monitoringIntervalMinutes === "number" && body.monitoringIntervalMinutes > 0) {
    patch.monitoringIntervalMinutes = body.monitoringIntervalMinutes
  }
  if (MONITORING_METHODS.includes(body.monitoringMethod)) patch.monitoringMethod = body.monitoringMethod
  if (IMAGE_POLICIES.includes(body.imagePolicy)) patch.imagePolicy = body.imagePolicy
  if (typeof body.notes === "string") patch.notes = body.notes
  if (SOCIAL_PRIORITIES.includes(body.priority)) patch.priority = body.priority

  const updated = await updateSource(id, patch)
  return NextResponse.json(updated)
}

/** 管理画面の「削除」。巡回履歴(CrawlLog)はソースIDに紐づくだけなので残っても実害はなく消さない */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const removed = await removeSource(id)
  if (!removed) return NextResponse.json({ error: "ソースが見つかりません" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
