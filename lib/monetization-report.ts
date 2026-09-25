import type { Article, Draft } from "./types"

export type MonetizationOpportunity = {
  kind: "published_without_affiliate" | "stale_draft" | "high_intent_article"
  title: string
  href: string
  reason: string
  score: number
}

export type MonetizationReport = {
  generatedAt: string
  publishedTotal: number
  publishedLast7Days: number
  draftsTotal: number
  staleDrafts: number
  affiliateCoverage: number
  officialLinkCoverage: number
  affiliateLinkCount: number
  opportunities: MonetizationOpportunity[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function timestamp(value?: string): number {
  const parsed = value ? Date.parse(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : 0
}

export function buildMonetizationReport(
  articles: Article[],
  drafts: Draft[],
  engagementScores = new Map<string, number>(),
  now = new Date()
): MonetizationReport {
  const nowMs = now.getTime()
  const sevenDaysAgo = nowMs - 7 * DAY_MS
  const staleBefore = nowMs - 48 * 60 * 60 * 1000
  const publishedLast7Days = articles.filter((article) => timestamp(article.publishedAt) >= sevenDaysAgo).length
  const stale = drafts.filter((draft) => timestamp(draft.sourcePublishedAt ?? draft.createdAt) < staleBefore)
  const withAffiliate = articles.filter((article) => article.affiliateLinks.length > 0)
  const withOfficial = articles.filter((article) => article.officialLinks.length > 0)

  const publishedWithoutAffiliate: MonetizationOpportunity[] = articles
    .filter((article) => article.affiliateLinks.length === 0)
    .map((article) => ({
      kind: "published_without_affiliate" as const,
      title: article.title,
      href: `/admin/articles/${article.id}/edit`,
      reason: "公開済みだが購入導線が未設定",
      score: 20 + (engagementScores.get(article.id) ?? 0),
    }))

  const highIntentArticles: MonetizationOpportunity[] = articles
    .filter((article) => article.affiliateLinks.length > 0 && (engagementScores.get(article.id) ?? 0) > 0)
    .map((article) => ({
      kind: "high_intent_article" as const,
      title: article.title,
      href: `/admin/articles/${article.id}/edit`,
      reason: `購入導線あり・7日間行動スコア ${engagementScores.get(article.id) ?? 0}`,
      score: 40 + (engagementScores.get(article.id) ?? 0),
    }))

  const staleDrafts: MonetizationOpportunity[] = stale.map((draft) => ({
    kind: "stale_draft" as const,
    title: draft.title,
    href: `/admin/drafts/${draft.id}`,
    reason: `48時間超の下書き・検索語 ${draft.suggestedAffiliateSearch.length}件`,
    score: 10 + draft.suggestedAffiliateSearch.length * 2,
  }))

  return {
    generatedAt: now.toISOString(),
    publishedTotal: articles.length,
    publishedLast7Days,
    draftsTotal: drafts.length,
    staleDrafts: stale.length,
    affiliateCoverage: articles.length === 0 ? 0 : withAffiliate.length / articles.length,
    officialLinkCoverage: articles.length === 0 ? 0 : withOfficial.length / articles.length,
    affiliateLinkCount: articles.reduce((sum, article) => sum + article.affiliateLinks.length, 0),
    opportunities: [...highIntentArticles, ...publishedWithoutAffiliate, ...staleDrafts]
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ja"))
      .slice(0, 30),
  }
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function absoluteSiteUrl(href: string): string {
  return href.startsWith("http") ? href : `https://dropx3.com${href}`
}

export function renderMonetizationMarkdown(report: MonetizationReport, sourceLabel = "本番Blob"): string {
  const generated = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(report.generatedAt))
  const lines = [
    "---",
    "status: 運用中",
    "category: メディア収益化",
    `last_synced: ${report.generatedAt}`,
    `data_source: ${sourceLabel}`,
    "tags:",
    "  - DROP-DROP-DROP",
    "  - アフィリエイト",
    "  - 収益改善",
    "---",
    "",
    "# DROP DROP DROP Monetization Dashboard",
    "",
    `> 自動生成: ${generated}。データ元: ${sourceLabel}。`,
    "",
    "## KPI",
    "",
    "| 指標 | 現在値 |",
    "|---|---:|",
    `| 公開記事 | ${report.publishedTotal} |`,
    `| 直近7日公開 | ${report.publishedLast7Days} |`,
    `| 下書き | ${report.draftsTotal} |`,
    `| 48時間超の下書き | ${report.staleDrafts} |`,
    `| アフィリエイト導線のある記事 | ${percent(report.affiliateCoverage)} |`,
    `| 公式リンクのある記事 | ${percent(report.officialLinkCoverage)} |`,
    `| アフィリエイトリンク総数 | ${report.affiliateLinkCount} |`,
    "",
    "## 今週の収益改善候補",
    "",
    ...report.opportunities.slice(0, 15).map((item) =>
      `- [ ] [${item.title}](${absoluteSiteUrl(item.href)}) — ${item.reason}`
    ),
    "",
    "## 週次レビュー",
    "",
    "- [ ] A8／楽天の発生・確定成果を確認する",
    "- [ ] 表示1000回あたり確定報酬でバナーを比較する",
    "- [ ] 公式発表・楽天商品詳細が出たGoss!pを再確認する",
    "- [ ] 48時間超の下書きを公開・更新・保留に振り分ける",
    "- [ ] 購入導線なしの公開記事を上位候補から改善する",
    "",
    "## 関連ノート",
    "",
    "- [[DROP DROP DROP]]",
    "- [[DROP DROP DROP Monetization Experiments]]",
    "",
  ]
  return lines.join("\n")
}
