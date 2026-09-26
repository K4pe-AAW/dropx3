import fs from "node:fs/promises"
import path from "node:path"
import { loadEnvLocal } from "./load-env"
import type { Article, Draft } from "../lib/types"

async function readLocalJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(process.cwd(), relativePath), "utf8")) as T
}

async function latestGrowthSnapshot(): Promise<{ path: string; data: import("../lib/seo-performance").SearchPerformanceSnapshot } | null> {
  const folder = process.env.GROWTH_OS_DROP_METRICS_PATH ?? "/Users/koh/Desktop/claude01/growth-os/data/metrics/dropx3"
  try {
    const files = (await fs.readdir(folder)).filter((name) => name.endsWith(".json")).sort()
    const latest = files.at(-1)
    if (!latest) return null
    const file = path.join(folder, latest)
    return { path: file, data: JSON.parse(await fs.readFile(file, "utf8")) }
  } catch {
    return null
  }
}

async function main() {
  loadEnvLocal()
  const [{ getAllArticles, getPendingDrafts }, { getEngagementScores }, { buildMonetizationReport, renderMonetizationMarkdown }] =
    await Promise.all([
      import("../lib/storage"),
      import("../lib/engagement"),
      import("../lib/monetization-report"),
    ])

  const vaultPath = process.env.OBSIDIAN_VAULT_PATH ?? "/Users/koh/Documents/Obsidian/koh_Knowledge"
  const folder = path.join(vaultPath, "03_Projects", "DROP DROP DROP")
  const dashboardPath = path.join(folder, "DROP DROP DROP Monetization Dashboard.md")
  const experimentsPath = path.join(folder, "DROP DROP DROP Monetization Experiments.md")
  const seoQueuePath = path.join(folder, "DROP DROP DROP SEO Improvement Queue.md")
  let articles: Article[]
  let drafts: Draft[]
  let scores = new Map<string, number>()
  let sourceLabel = "本番Blob（公開記事・下書き・匿名行動データ）"
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    ;[articles, drafts, scores] = await Promise.all([getAllArticles(), getPendingDrafts(), getEngagementScores(7)])
  } else {
    const [articleData, draftData] = await Promise.all([
      readLocalJson<{ articles: Article[] }>("data/articles.json"),
      readLocalJson<{ drafts: Draft[] }>("data/drafts.json"),
    ])
    articles = articleData.articles
    drafts = draftData.drafts.filter((draft) => draft.status === "pending")
    sourceLabel = "リポジトリ内JSON（Blob未接続・参考値）"
    console.warn("Blob未接続のため、リポジトリ内JSONからObsidianへ同期します。")
  }
  const report = buildMonetizationReport(articles, drafts, scores)

  await fs.mkdir(folder, { recursive: true })
  await fs.writeFile(dashboardPath, renderMonetizationMarkdown(report, sourceLabel), "utf8")
  const growth = await latestGrowthSnapshot()
  if (growth) {
    const { renderSeoPerformanceMarkdown } = await import("../lib/seo-performance")
    await fs.writeFile(seoQueuePath, renderSeoPerformanceMarkdown(growth.data, growth.path), "utf8")
  }

  try {
    await fs.access(experimentsPath)
  } catch {
    await fs.writeFile(
      experimentsPath,
      [
      "---",
      "status: 運用中",
      "category: 収益実験",
      "tags:",
      "  - DROP-DROP-DROP",
      "  - アフィリエイト",
      "---",
      "",
      "# DROP DROP DROP Monetization Experiments",
      "",
      "> このノートは手動の判断ログ。自動同期では上書きしない。",
      "",
      "## 実験中",
      "",
      "- [ ] オルビス／ZIGEN横長バナーを表示1000回あたり確定報酬で比較",
      "- [ ] ULTORA／MYTREXを表示1000回あたり確定報酬で比較",
      "- [ ] Safari公式確認後プロンプトのaffiliate_click増分を確認",
      "",
      "## 結果",
      "",
      "| 期間 | 配置 | 表示 | クリック | 発生 | 確定報酬 | 判断 |",
      "|---|---|---:|---:|---:|---:|---|",
      "",
      "## 判断ログ",
      "",
      ].join("\n"),
      "utf8"
    )
  }

  console.log(`Obsidian同期完了: ${dashboardPath}`)
  console.log(growth ? `SEOキュー同期完了: ${seoQueuePath}` : "SEOキュー: Growth OSデータ未検出")
  console.log(`公開 ${report.publishedTotal} / 下書き ${report.draftsTotal} / 改善候補 ${report.opportunities.length}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
