import Link from "next/link"
import type { Metadata } from "next"
import { listSources, seedSourcesIfMissing, listProducts } from "@/lib/source-watch/storage"
import { INITIAL_SOURCES } from "@/lib/source-watch/seed-sources"
import { listProductCards } from "@/lib/source-watch/present"
import { SocialWatchDashboard } from "@/components/admin/source-watch/social/SocialWatchDashboard"

export const metadata: Metadata = { title: "SOCIAL WATCH" }

export default async function SocialWatchPage() {
  try {
    await seedSourcesIfMissing(INITIAL_SOURCES)
  } catch {
    // /admin/source-watch/page.tsxと同じ理由でビルド時は無視する
  }

  const allSources = await listSources()
  const socialSources = allSources.filter((s) => s.category === "social")

  const allProducts = await listProducts()
  const socialProducts = allProducts.filter((p) => p.social && p.reviewStatus !== "ignored")
  const cards = await listProductCards(socialProducts)

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black">SOURCE WATCH</h1>
          <div className="flex items-center rounded-full bg-secondary p-0.5">
            <Link href="/admin/source-watch" className="rounded-full px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground">
              ファッション
            </Link>
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">SOCIAL WATCH</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/source-watch/sources" className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline">
            情報源を管理
          </Link>
          <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground underline">
            管理画面トップへ
          </Link>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-6">
        Instagram等は「情報発見の一次情報源」として扱います。画像の自動転載はしません — 情報の信頼度と画像の利用権は別判定です。
        新着の自動検知には対応していないため(Meta公式APIの制約)、投稿URLとキャプションを貼って解析してください。
      </p>

      <SocialWatchDashboard initialCards={cards} initialSources={socialSources} />
    </div>
  )
}
