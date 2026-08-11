import Link from "next/link"
import type { Metadata } from "next"
import { listSources, seedSourcesIfMissing, listProducts } from "@/lib/source-watch/storage"
import { INITIAL_SOURCES } from "@/lib/source-watch/seed-sources"
import { listProductCards, sortCardsByPriority } from "@/lib/source-watch/present"
import { SourceWatchDashboard } from "@/components/admin/source-watch/SourceWatchDashboard"

export const metadata: Metadata = { title: "SOURCE WATCH" }

/** 運用ガイド(Artifact)。同じfile_pathで再公開すればURLは変わらない */
const ADMIN_GUIDE_URL = "https://claude.ai/code/artifact/643aaaf7-ac93-4cc5-8924-29896976591c"

export default async function SourceWatchPage() {
  try {
    await seedSourcesIfMissing(INITIAL_SOURCES)
  } catch {
    // ビルド時の静的解析パス等、書き込みができないタイミングで呼ばれた場合はスキップする。
    // このページはBlob読み取りにcache:"no-store"を使うため実運用では常に動的レンダリングされ、
    // 次回の実アクセス時に再試行される(admin/page.tsx等、他の管理画面と同じ挙動)。
  }
  const sources = await listSources()
  // SOCIAL WATCH(Instagram等)由来の商品はそちら専用タブでのみ扱う(こちらに混在させない)
  const products = (await listProducts()).filter((p) => p.reviewStatus !== "ignored" && !p.social)
  const cards = sortCardsByPriority(await listProductCards(products))

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black">SOURCE WATCH</h1>
          <div className="flex items-center rounded-full bg-secondary p-0.5">
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">ファッション</span>
            <Link href="/admin/source-watch/social" className="rounded-full px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground">
              SOCIAL WATCH
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/source-watch/sources" className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline">
            情報源を管理({sources.length})
          </Link>
          <a href={ADMIN_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground underline">
            使い方ガイド
          </a>
          <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground underline">
            管理画面トップへ
          </Link>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-6">
        自動公開はしません。CONFIRMED(公式/国内正規販売店で確認済み)のみ「記事候補を見る」から下書きを生成できます。
      </p>

      <SourceWatchDashboard initialCards={cards} />
    </div>
  )
}
