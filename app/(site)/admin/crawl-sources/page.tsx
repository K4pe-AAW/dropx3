import Link from "next/link"
import type { Metadata } from "next"
import { getCrawlSources } from "@/lib/storage"
import { CrawlSourcesManager } from "@/components/admin/CrawlSourcesManager"

export const metadata: Metadata = { title: "収集元の管理" }
export const dynamic = "force-dynamic"

export default async function CrawlSourcesPage() {
  const { youtube, brands } = await getCrawlSources()

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-black">収集元の管理</h1>
        <Link href="/admin" className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline">
          管理画面トップへ
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        RSS収集(6時間おき)が巡回するYouTubeチャンネルと、下書きレビュー時に画像取得先として提案するブランド公式サイトを管理します。
      </p>

      <CrawlSourcesManager youtube={youtube} brands={brands} />
    </div>
  )
}
