import Link from "next/link"
import type { Metadata } from "next"
import { listSources, seedSourcesIfMissing, listProducts, getLatestCrawlLog } from "@/lib/source-watch/storage"
import { INITIAL_SOURCES } from "@/lib/source-watch/seed-sources"
import { listProductCards } from "@/lib/source-watch/present"
import { SourceWatchSources } from "@/components/admin/SourceWatchSources"
import { SourceWatchCandidates } from "@/components/admin/SourceWatchCandidates"

export const metadata: Metadata = { title: "SOURCE WATCH" }

export default async function SourceWatchPage() {
  try {
    await seedSourcesIfMissing(INITIAL_SOURCES)
  } catch {
    // ビルド時の静的解析パス等、書き込みができないタイミングで呼ばれた場合はスキップする。
    // このページはBlob読み取りにcache:"no-store"を使うため実運用では常に動的レンダリングされ、
    // 次回の実アクセス時に再試行される(admin/page.tsx等、他の管理画面と同じ挙動)。
  }
  const sources = await listSources()
  const sourcesWithLogs = await Promise.all(
    sources.map(async (s) => ({ ...s, latestCrawlLog: await getLatestCrawlLog(s.id) }))
  )
  const products = (await listProducts()).filter((p) => p.reviewStatus !== "ignored")
  const cards = await listProductCards(products)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-black">SOURCE WATCH</h1>
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground underline">
          管理画面トップへ
        </Link>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8">
        情報源を監視 → 新着検出 → 商品抽出 → 一次情報確認 → 画像権利判定 → 人間レビュー、の流れで記事候補を作ります。
        自動公開はしません。CONFIRMED(公式/国内正規販売店で確認済み)のみ「記事候補を見る」から下書きを生成できます。
      </p>

      <section className="mb-12">
        <h2 className="text-sm font-bold mb-3">情報源(Source)一覧</h2>
        <SourceWatchSources initialSources={sourcesWithLogs} />
      </section>

      <section>
        <h2 className="text-sm font-bold mb-3">記事候補(Product)</h2>
        <SourceWatchCandidates initialCards={cards} />
      </section>
    </div>
  )
}
