import type { Article, ArticlesData } from "./types"
import { mutateArticles, mutateJson, readArticles, readJson, writeJson } from "./storage"

const AUTO_PUBLISH_STATE_PATH = "data/daily-auto-publish-state.json"
const CLEANUP_STATE_PATH = "data/auto-purchase-channel-cleanup-state.json"

type AutoPublishState = {
  runs?: Record<string, { publishedArticleIds?: string[] }>
}

export type AutoPurchaseChannelCleanupSummary = {
  completedAt: string
  backupPath: string | null
  autoPublishedArticleCount: number
  cleanedArticleCount: number
  removedChannelCount: number
  cleanedArticleIds: string[]
}

export function removeAutoPublishedPurchaseChannels(
  data: ArticlesData,
  autoPublishedIds: ReadonlySet<string>,
  updatedAt: string
): { data: ArticlesData; cleaned: Article[]; removedChannelCount: number } {
  const cleaned: Article[] = []
  let removedChannelCount = 0
  const articles = data.articles.map((article) => {
    if (!autoPublishedIds.has(article.id) || !article.purchaseChannels?.length) return article
    removedChannelCount += article.purchaseChannels.length
    const next: Article = { ...article, updatedAt }
    delete next.purchaseChannels
    cleaned.push(next)
    return next
  })
  return {
    data: cleaned.length > 0 ? { ...data, articles, lastUpdated: updatedAt } : data,
    cleaned,
    removedChannelCount,
  }
}

export async function cleanupAutoPublishedPurchaseChannels(): Promise<AutoPurchaseChannelCleanupSummary> {
  const existing = await readJson<AutoPurchaseChannelCleanupSummary | null>(CLEANUP_STATE_PATH, null)
  if (existing) return existing

  const autoState = await readJson<AutoPublishState>(AUTO_PUBLISH_STATE_PATH, { runs: {} })
  const ids = new Set(Object.values(autoState.runs ?? {}).flatMap((run) => run.publishedArticleIds ?? []))
  const before = await readArticles()
  const targetCount = before.articles.filter((article) => ids.has(article.id) && article.purchaseChannels?.length).length
  const timestamp = new Date().toISOString()
  const backupPath = targetCount > 0
    ? `backups/manual-purchase-channel-cleanup-${timestamp.replace(/[:.]/g, "-")}/articles.json`
    : null
  if (backupPath) await writeJson(backupPath, before)

  let cleanedArticleIds: string[] = []
  let removedChannelCount = 0
  if (targetCount > 0) {
    await mutateArticles((latest) => {
      const result = removeAutoPublishedPurchaseChannels(latest, ids, timestamp)
      cleanedArticleIds = result.cleaned.map((article) => article.id)
      removedChannelCount = result.removedChannelCount
      return result.data
    })
  }

  const summary: AutoPurchaseChannelCleanupSummary = {
    completedAt: timestamp,
    backupPath,
    autoPublishedArticleCount: ids.size,
    cleanedArticleCount: cleanedArticleIds.length,
    removedChannelCount,
    cleanedArticleIds,
  }
  await mutateJson<AutoPurchaseChannelCleanupSummary | null>(CLEANUP_STATE_PATH, null, () => summary)
  return summary
}
