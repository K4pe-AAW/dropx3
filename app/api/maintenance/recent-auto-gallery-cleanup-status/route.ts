import { NextResponse } from "next/server"
import { readJson } from "@/lib/storage"
import type { RecentGalleryCleanupSummary } from "@/lib/recent-auto-gallery-cleanup"

export const dynamic = "force-dynamic"

export async function GET() {
  const summary = await readJson<RecentGalleryCleanupSummary | null>(
    "data/recent-auto-gallery-cleanup-2026-08-30.json",
    null
  )
  return NextResponse.json(summary ? { completed: true, ...summary } : { completed: false })
}
