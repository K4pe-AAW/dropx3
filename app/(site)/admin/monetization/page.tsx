import Link from "next/link"
import type { Metadata } from "next"
import { getEngagementScores } from "@/lib/engagement"
import { buildMonetizationReport } from "@/lib/monetization-report"
import { getAllArticles, getPendingDrafts } from "@/lib/storage"

export const metadata: Metadata = { title: "収益改善" }
export const dynamic = "force-dynamic"

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export default async function MonetizationPage() {
  const [articles, drafts, scores] = await Promise.all([
    getAllArticles(),
    getPendingDrafts(),
    getEngagementScores(7).catch(() => new Map<string, number>()),
  ])
  const report = buildMonetizationReport(articles, drafts, scores)
  const cards = [
    ["直近7日公開", report.publishedLast7Days],
    ["48時間超下書き", report.staleDrafts],
    ["購入導線カバー率", percent(report.affiliateCoverage)],
    ["公式リンクカバー率", percent(report.officialLinkCoverage)],
  ]

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-muted-foreground">MONETIZATION</p>
          <h1 className="mt-2 text-2xl font-black">収益改善ダッシュボード</h1>
          <p className="mt-2 text-sm text-muted-foreground">記事数・画像数を維持したまま、購入導線と下書き鮮度を改善します。</p>
        </div>
        <Link href="/admin" className="text-sm font-bold underline">管理画面へ戻る</Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-bold text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">優先改善候補</h2>
            <p className="mt-1 text-xs text-muted-foreground">7日間の閲覧・読了・購入クリックと導線不足、下書き鮮度から自動選定。</p>
          </div>
          <p className="text-xs text-muted-foreground">公開 {report.publishedTotal} / 下書き {report.draftsTotal} / 導線 {report.affiliateLinkCount}</p>
        </div>
        <ol className="mt-5 divide-y divide-border">
          {report.opportunities.slice(0, 20).map((item, index) => (
            <li key={`${item.kind}-${item.href}`} className="flex gap-4 py-4">
              <span className="w-6 shrink-0 text-sm font-black text-muted-foreground">{index + 1}</span>
              <div className="min-w-0">
                <Link href={item.href} className="font-bold hover:underline">{item.title}</Link>
                <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 rounded-xl border border-dashed border-border p-6">
        <h2 className="font-black">Obsidian連携</h2>
        <p className="mt-2 text-sm text-muted-foreground">ローカルで <code className="rounded bg-secondary px-1.5 py-0.5">npm run obsidian:sync</code> を実行すると、この指標とタスクをVaultへ同期します。判断ログは別ノートに保持され、自動同期で上書きされません。</p>
      </section>
    </main>
  )
}
