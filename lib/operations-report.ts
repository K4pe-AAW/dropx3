import type { Article, Draft } from "./types"
import type { AutoPublishState } from "./daily-auto-publish"
import { isFashionsnapSourced } from "./article-source"
import { isWomenFocusedDraft } from "./article-audience"

const HOUR_MS = 60 * 60 * 1000

export type OperationsReport = {
  generatedAt: string
  pendingDrafts: number
  oldestDraftAt?: string
  oldestDraftAgeHours: number
  staleDrafts: number
  currentSlotPublished: number
  currentSlotAttempts: number
  currentSlotLastAttemptAt?: string
  currentSlotErrors: string[]
  recentPublished: number
  recentYoutube: number
  recentWomenFocused: number
  recentFashionsnap: number
  sourceCounts: Array<{ source: string; count: number }>
}

function time(value?: string): number {
  const parsed = value ? Date.parse(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : 0
}

function draftDate(draft: Draft): string {
  return draft.sourcePublishedAt ?? draft.createdAt
}

function sourceName(article: Article): string {
  return article.sourceRefs[0]?.name?.trim() || "出典不明"
}

export function buildOperationsReport(
  articles: Article[],
  drafts: Draft[],
  state: AutoPublishState,
  currentSlotKey: string,
  now = new Date()
): OperationsReport {
  const sortedDrafts = drafts.slice().sort((a, b) => time(draftDate(a)) - time(draftDate(b)))
  const oldestDraftAt = sortedDrafts[0] ? draftDate(sortedDrafts[0]) : undefined
  const oldestDraftAgeHours = oldestDraftAt
    ? Math.max(0, Math.floor((now.getTime() - time(oldestDraftAt)) / HOUR_MS))
    : 0
  const staleDrafts = drafts.filter((draft) => now.getTime() - time(draftDate(draft)) > 48 * HOUR_MS).length
  const current = state.runs[currentSlotKey]
  const recent = articles.slice().sort((a, b) => time(b.publishedAt) - time(a.publishedAt)).slice(0, 12)
  const counts = new Map<string, number>()
  for (const article of recent) {
    const source = sourceName(article)
    counts.set(source, (counts.get(source) ?? 0) + 1)
  }

  return {
    generatedAt: now.toISOString(),
    pendingDrafts: drafts.length,
    ...(oldestDraftAt ? { oldestDraftAt } : {}),
    oldestDraftAgeHours,
    staleDrafts,
    currentSlotPublished: current?.publishedArticleIds?.length ?? 0,
    currentSlotAttempts: current?.attempts ?? 0,
    ...(current?.lastAttemptAt ? { currentSlotLastAttemptAt: current.lastAttemptAt } : {}),
    currentSlotErrors: current?.lastErrors ?? [],
    recentPublished: recent.length,
    recentYoutube: recent.filter((article) => Boolean(article.youtubeVideoId)).length,
    recentWomenFocused: recent.filter(isWomenFocusedDraft).length,
    recentFashionsnap: recent.filter(isFashionsnapSourced).length,
    sourceCounts: [...counts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source, "ja")),
  }
}
