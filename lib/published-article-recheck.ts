import { brushUpDraftWithUrl, type BrushUpResult } from "./draft-brushup"
import { isSafeExternalUrl } from "./affiliate"
import { isDirectRakutenProductUrl, removeGosspTitlePrefix } from "./information-status"
import { mutateArticles, mutateJson, readArticles } from "./storage"
import type { Article, InformationStatus } from "./types"

export const PUBLISHED_RECHECK_STATE_PATH = "data/published-article-recheck-state-v1.json"
export const MAX_RECHECKS_PER_RUN = 4
const MAX_AGE_MS = 120 * 24 * 60 * 60 * 1000

export type PublishedRecheckState = {
  lastRunAt?: string
  checked?: number
  updated?: number
  upgraded?: number
  errors?: string[]
}

export type ArticleRecheckResult = {
  articleId: string
  checkedAt: string
  patch: Partial<Article>
  materiallyUpdated: boolean
  upgraded: boolean
}

function isRecheckableOfficialUrl(value: string): boolean {
  if (!isSafeExternalUrl(value)) return false
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, "")
    if (["google.com", "youtube.com", "youtu.be", "instagram.com", "x.com", "twitter.com", "facebook.com", "tiktok.com"].includes(host)) return false
    return url.pathname.split("/").filter(Boolean).length > 0
  } catch {
    return false
  }
}

export function recheckSourceUrl(article: Article): string | null {
  const official = article.officialLinks.find((link) => isRecheckableOfficialUrl(link.url))?.url
  if (official) return official
  return [
    ...article.sourceRefs.map((ref) => ref.url),
    ...(article.purchaseChannels ?? []).map((channel) => channel.url).filter((url): url is string => Boolean(url)),
  ].find(isDirectRakutenProductUrl) ?? null
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export function buildRecheckResult(
  article: Article,
  refreshed: BrushUpResult,
  sourceUrl: string,
  checkedAt: string
): ArticleRecheckResult {
  const evidenceConfirmed = isRecheckableOfficialUrl(sourceUrl) || isDirectRakutenProductUrl(sourceUrl)
  const nextStatus: InformationStatus | undefined =
    article.informationStatus === "rumor" && evidenceConfirmed ? "report" : article.informationStatus
  const nextTitle = nextStatus === "report" ? removeGosspTitlePrefix(refreshed.title) : refreshed.title
  const nextColorways = refreshed.colorways.length > 0 ? refreshed.colorways : article.colorways
  const materiallyUpdated =
    nextTitle !== article.title ||
    refreshed.excerpt !== article.excerpt ||
    !sameJson(refreshed.bodyParagraphs, article.bodyParagraphs) ||
    !sameJson(nextColorways, article.colorways) ||
    nextStatus !== article.informationStatus
  const upgraded = article.informationStatus === "rumor" && nextStatus === "report"

  return {
    articleId: article.id,
    checkedAt,
    materiallyUpdated,
    upgraded,
    patch: {
      title: nextTitle,
      excerpt: refreshed.excerpt,
      bodyParagraphs: refreshed.bodyParagraphs,
      ...(nextColorways ? { colorways: nextColorways } : {}),
      ...(nextStatus ? { informationStatus: nextStatus } : {}),
      lastVerifiedAt: checkedAt,
      ...(materiallyUpdated ? { updatedAt: checkedAt } : {}),
    },
  }
}

export async function runPublishedArticleRecheck(
  now = new Date(),
  refresh: typeof brushUpDraftWithUrl = brushUpDraftWithUrl
): Promise<PublishedRecheckState> {
  const checkedAt = now.toISOString()
  const { articles } = await readArticles()
  const candidates = articles
    .filter((article) => now.getTime() - Date.parse(article.publishedAt) <= MAX_AGE_MS)
    .map((article) => ({ article, sourceUrl: recheckSourceUrl(article) }))
    .filter((item): item is { article: Article; sourceUrl: string } => Boolean(item.sourceUrl))
    .sort((a, b) => Date.parse(a.article.lastVerifiedAt ?? "1970-01-01") - Date.parse(b.article.lastVerifiedAt ?? "1970-01-01"))
    .slice(0, MAX_RECHECKS_PER_RUN)

  const results: ArticleRecheckResult[] = []
  const errors: string[] = []
  for (const { article, sourceUrl } of candidates) {
    try {
      const refreshed = await refresh(
        {
          title: article.title,
          excerpt: article.excerpt,
          bodyParagraphs: article.bodyParagraphs,
          colorways: article.colorways ?? [],
          informationStatus: article.informationStatus,
        },
        sourceUrl
      )
      results.push(buildRecheckResult(article, refreshed, sourceUrl, checkedAt))
    } catch (error) {
      errors.push(`${article.title}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (results.length > 0) {
    const byId = new Map(results.map((result) => [result.articleId, result]))
    await mutateArticles((data) => {
      data.articles = data.articles.map((article) => {
        const result = byId.get(article.id)
        return result ? { ...article, ...result.patch } : article
      })
      if (results.some((result) => result.materiallyUpdated)) data.lastUpdated = checkedAt
      return data
    })
  }

  const state: PublishedRecheckState = {
    lastRunAt: checkedAt,
    checked: results.length,
    updated: results.filter((result) => result.materiallyUpdated).length,
    upgraded: results.filter((result) => result.upgraded).length,
    errors: errors.slice(0, 20),
  }
  await mutateJson<PublishedRecheckState>(PUBLISHED_RECHECK_STATE_PATH, {}, () => state)
  return state
}
