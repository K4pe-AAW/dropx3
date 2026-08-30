import { mutateArticles, mutateJson, readArticles, readJson, writeJson } from "./storage"

const SLOT = "2099-01-02-08"
const STATE_PATH = "data/recent-auto-gallery-cleanup-2026-08-30.json"

type AutoState = { runs?: Record<string, { publishedArticleIds?: string[] }> }
export type RecentGalleryCleanupSummary = {
  completedAt: string
  targetArticleCount: number
  updatedArticleCount: number
  removedImageCount: number
}

export async function cleanupRecentAutoGallery(): Promise<RecentGalleryCleanupSummary> {
  const existing = await readJson<RecentGalleryCleanupSummary | null>(STATE_PATH, null)
  if (existing) return existing
  const autoState = await readJson<AutoState>("data/daily-auto-publish-state.json", { runs: {} })
  const ids = new Set(autoState.runs?.[SLOT]?.publishedArticleIds ?? [])
  const before = await readArticles()
  const completedAt = new Date().toISOString()
  const targets = before.articles.filter((article) => ids.has(article.id) && article.galleryImages.length > 0)
  if (targets.length > 0) {
    await writeJson(`backups/recent-auto-gallery-cleanup-${completedAt.replace(/[:.]/g, "-")}/articles.json`, before)
  }
  let updatedArticleCount = 0
  let removedImageCount = 0
  await mutateArticles((data) => {
    const articles = data.articles.map((article) => {
      if (!ids.has(article.id) || article.galleryImages.length === 0) return article
      updatedArticleCount += 1
      removedImageCount += article.galleryImages.length
      return { ...article, galleryImages: [], updatedAt: completedAt }
    })
    return updatedArticleCount > 0 ? { ...data, articles, lastUpdated: completedAt } : data
  })
  const summary = { completedAt, targetArticleCount: ids.size, updatedArticleCount, removedImageCount }
  await mutateJson<RecentGalleryCleanupSummary | null>(STATE_PATH, null, () => summary)
  return summary
}
