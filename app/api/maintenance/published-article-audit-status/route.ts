import { NextResponse } from "next/server"
import { readJson } from "@/lib/storage"
import type { PublishedArticleAuditSummary } from "@/lib/published-article-audit"

export const dynamic = "force-dynamic"

export async function GET() {
  const summary = await readJson<PublishedArticleAuditSummary | null>("data/published-article-audit-2026-08-29.json", null)
  if (!summary) return NextResponse.json({ completed: false })
  return NextResponse.json({
    completed: true,
    completedAt: summary.completedAt,
    articleCount: summary.articleCount,
    updatedArticleCount: summary.updatedArticleCount,
    removedPurchaseChannelCount: summary.removedPurchaseChannelCount,
    removedDuplicateGalleryImageCount: summary.removedDuplicateGalleryImageCount,
  })
}
