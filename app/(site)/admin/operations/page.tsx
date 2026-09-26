import Link from "next/link"
import type { Metadata } from "next"
import { AUTO_PUBLISH_STATE_PATH, jstSlotKey, type AutoPublishState } from "@/lib/daily-auto-publish"
import { buildOperationsReport } from "@/lib/operations-report"
import {
  PUBLISHED_RECHECK_STATE_PATH,
  type PublishedRecheckState,
} from "@/lib/published-article-recheck"
import { getAllArticles, getPendingDrafts, readJson } from "@/lib/storage"
import { backupAgeHours, readBackupHealth } from "@/lib/backup-health"

export const metadata: Metadata = { title: "公開運用" }
export const dynamic = "force-dynamic"

function jst(value?: string): string {
  if (!value) return "未実行"
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

export default async function OperationsPage() {
  const now = new Date()
  const [articles, drafts, state, recheck, backup] = await Promise.all([
    getAllArticles(),
    getPendingDrafts(),
    readJson<AutoPublishState>(AUTO_PUBLISH_STATE_PATH, { runs: {} }),
    readJson<PublishedRecheckState>(PUBLISHED_RECHECK_STATE_PATH, {}),
    readBackupHealth(),
  ])
  const report = buildOperationsReport(articles, drafts, state, jstSlotKey(now), now)
  const cards = [
    ["下書き", report.pendingDrafts],
    ["最古下書き", report.oldestDraftAt ? `${report.oldestDraftAgeHours}時間` : "なし"],
    ["48時間超", report.staleDrafts],
    ["現在枠", `${report.currentSlotPublished}/5件`],
  ]

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-muted-foreground">OPERATIONS</p>
          <h1 className="mt-2 text-2xl font-black">公開運用ダッシュボード</h1>
          <p className="mt-2 text-sm text-muted-foreground">下書き滞留、2時間枠、公開失敗、媒体配分を確認します。</p>
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

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-black">現在の2時間枠</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted-foreground">実行回数</dt><dd className="mt-1 font-black">{report.currentSlotAttempts}</dd></div>
            <div><dt className="text-muted-foreground">最終実行</dt><dd className="mt-1 font-black">{jst(report.currentSlotLastAttemptAt)}</dd></div>
          </dl>
          <h3 className="mt-6 text-sm font-black">直近の公開失敗理由</h3>
          {report.currentSlotErrors.length > 0 ? (
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              {report.currentSlotErrors.map((error) => <li key={error} className="rounded-lg bg-secondary p-3">{error}</li>)}
            </ul>
          ) : <p className="mt-3 text-xs text-muted-foreground">記録された失敗はありません。</p>}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-black">直近12記事の配分</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted-foreground">YouTube</dt><dd className="mt-1 font-black">{report.recentYoutube}/{report.recentPublished}</dd></div>
            <div><dt className="text-muted-foreground">女性向け</dt><dd className="mt-1 font-black">{report.recentWomenFocused}/{report.recentPublished}</dd></div>
            <div><dt className="text-muted-foreground">FASHIONSNAP</dt><dd className="mt-1 font-black">{report.recentFashionsnap}/{report.recentPublished}</dd></div>
          </dl>
          <h3 className="mt-6 text-sm font-black">情報元</h3>
          <ul className="mt-3 space-y-2 text-xs">
            {report.sourceCounts.map((item) => (
              <li key={item.source} className="flex justify-between border-b border-border pb-2"><span>{item.source}</span><strong>{item.count}</strong></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-black">公開済み記事の自動再確認</h2>
        <p className="mt-2 text-sm text-muted-foreground">毎日7:30 JSTに確認済み公式商品ページ・楽天商品詳細を最大4件再確認。画像は変更しません。</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-4 text-sm">
          <div><dt className="text-muted-foreground">最終実行</dt><dd className="mt-1 font-black">{jst(recheck.lastRunAt)}</dd></div>
          <div><dt className="text-muted-foreground">確認</dt><dd className="mt-1 font-black">{recheck.checked ?? 0}</dd></div>
          <div><dt className="text-muted-foreground">更新</dt><dd className="mt-1 font-black">{recheck.updated ?? 0}</dd></div>
          <div><dt className="text-muted-foreground">Goss!p解除</dt><dd className="mt-1 font-black">{recheck.upgraded ?? 0}</dd></div>
        </dl>
        {(recheck.errors?.length ?? 0) > 0 && (
          <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
            {recheck.errors?.map((error) => <li key={error} className="rounded-lg bg-secondary p-3">{error}</li>)}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-black">データ保全</h2>
        <p className="mt-2 text-sm text-muted-foreground">記事・下書き・予約・収集元を毎日バックアップし、容量と失敗を監視します。</p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">最終バックアップ</dt><dd className="mt-1 font-black">{jst(backup.completedAt)}</dd></div>
          <div><dt className="text-muted-foreground">経過</dt><dd className="mt-1 font-black">{backupAgeHours(backup) === null ? "未実行" : `${backupAgeHours(backup)}時間`}</dd></div>
          <div><dt className="text-muted-foreground">対象容量</dt><dd className="mt-1 font-black">{backup.totalBytes ? `${(backup.totalBytes / 1024 / 1024).toFixed(2)} MB` : "未計測"}</dd></div>
        </dl>
        {backup.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700">{backup.error}</p>}
        {backupAgeHours(backup) !== null && (backupAgeHours(backup) ?? 0) > 36 && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-800">バックアップが36時間以上更新されていません。</p>}
      </section>
    </main>
  )
}
