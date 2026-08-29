import { canonicalImageKey } from "./image-candidates"
import { mutateArticles, mutateJson, readArticles, readJson, writeJson } from "./storage"
import type { Article, ArticlesData } from "./types"

const AUDIT_STATE_PATH = "data/published-article-audit-2026-08-29.json"

export type PublishedArticleAuditSummary = {
  completedAt: string
  backupPath: string | null
  articleCount: number
  updatedArticleCount: number
  removedPurchaseChannelCount: number
  removedDuplicateGalleryImageCount: number
}

export function normalizePublishedArticles(
  data: ArticlesData,
  updatedAt: string
): { data: ArticlesData; updated: Article[]; removedPurchaseChannels: number; removedDuplicateGalleryImages: number } {
  const updated: Article[] = []
  let removedPurchaseChannels = 0
  let removedDuplicateGalleryImages = 0
  const articles = data.articles.map((article) => {
    const seen = new Set([canonicalImageKey(article.coverImage)])
    const galleryImages = article.galleryImages.filter((image) => {
      const key = canonicalImageKey(image.url)
      if (!image.url || seen.has(key)) {
        removedDuplicateGalleryImages += 1
        return false
      }
      seen.add(key)
      return true
    })
    const channelCount = article.purchaseChannels?.length ?? 0
    const changed = channelCount > 0 || galleryImages.length !== article.galleryImages.length
    if (!changed) return article
    removedPurchaseChannels += channelCount
    const next: Article = { ...article, galleryImages, updatedAt }
    delete next.purchaseChannels
    updated.push(next)
    return next
  })
  return {
    data: updated.length > 0 ? { ...data, articles, lastUpdated: updatedAt } : data,
    updated,
    removedPurchaseChannels,
    removedDuplicateGalleryImages,
  }
}

export async function auditPublishedArticles(): Promise<PublishedArticleAuditSummary> {
  const existing = await readJson<PublishedArticleAuditSummary | null>(AUDIT_STATE_PATH, null)
  if (existing) return existing
  const before = await readArticles()
  const completedAt = new Date().toISOString()
  const preview = normalizePublishedArticles(before, completedAt)
  const backupPath = preview.updated.length > 0
    ? `backups/published-article-audit-${completedAt.replace(/[:.]/g, "-")}/articles.json`
    : null
  if (backupPath) await writeJson(backupPath, before)

  let final = preview
  if (preview.updated.length > 0) {
    await mutateArticles((latest) => {
      final = normalizePublishedArticles(latest, completedAt)
      return final.data
    })
  }
  const summary: PublishedArticleAuditSummary = {
    completedAt,
    backupPath,
    articleCount: before.articles.length,
    updatedArticleCount: final.updated.length,
    removedPurchaseChannelCount: final.removedPurchaseChannels,
    removedDuplicateGalleryImageCount: final.removedDuplicateGalleryImages,
  }
  await mutateJson<PublishedArticleAuditSummary | null>(AUDIT_STATE_PATH, null, () => summary)
  return summary
}
