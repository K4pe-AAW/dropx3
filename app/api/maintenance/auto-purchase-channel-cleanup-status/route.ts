import { NextResponse } from "next/server"
import { readJson } from "@/lib/storage"
import type { AutoPurchaseChannelCleanupSummary } from "@/lib/auto-purchase-channel-cleanup"

export const dynamic = "force-dynamic"

export async function GET() {
  const summary = await readJson<AutoPurchaseChannelCleanupSummary | null>(
    "data/auto-purchase-channel-cleanup-state.json",
    null
  )
  if (!summary) return NextResponse.json({ completed: false })
  return NextResponse.json({
    completed: true,
    completedAt: summary.completedAt,
    autoPublishedArticleCount: summary.autoPublishedArticleCount,
    cleanedArticleCount: summary.cleanedArticleCount,
    removedChannelCount: summary.removedChannelCount,
  })
}
