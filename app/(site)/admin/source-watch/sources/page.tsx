import Link from "next/link"
import type { Metadata } from "next"
import { listSources, seedSourcesIfMissing, getLatestCrawlLog } from "@/lib/source-watch/storage"
import { INITIAL_SOURCES } from "@/lib/source-watch/seed-sources"
import { SourceWatchSources } from "@/components/admin/SourceWatchSources"

export const metadata: Metadata = { title: "SOURCE WATCH - 情報源管理" }
export const dynamic = "force-dynamic"

export default async function SourceWatchSourcesPage() {
  try {
    await seedSourcesIfMissing(INITIAL_SOURCES)
  } catch {
    // SOURCE WATCHトップページと同じ理由でビルド時は無視する(app/(site)/admin/source-watch/page.tsx参照)
  }
  const sources = await listSources()
  const sourcesWithLogs = await Promise.all(sources.map(async (s) => ({ ...s, latestCrawlLog: await getLatestCrawlLog(s.id) })))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-black">情報源(Source)管理</h1>
        <Link href="/admin/source-watch" className="text-xs text-muted-foreground hover:text-foreground underline">
          ← SOURCE WATCHへ戻る
        </Link>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8">
        監視する情報源の登録・有効化・巡回頻度・画像利用ポリシーを管理します。ここで巡回した結果、新しい商品候補がSOURCE WATCHのメイン画面に出てきます。
      </p>

      <SourceWatchSources initialSources={sourcesWithLogs} />
    </div>
  )
}
