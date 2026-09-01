import type { Metadata } from "next"
import { ArticleCard } from "@/components/ArticleCard"
import { getArticlesByContentType } from "@/lib/storage"
import { matchesSnapFilter } from "@/lib/snap"

export const metadata: Metadata = {
  title: "編集部スナップ",
  description: "DROP DROP DROP編集部が街で撮影した、リアルな着こなしと愛用品を紹介します。",
}
export const dynamic = "force-dynamic"

export default async function SnapPage({ searchParams }: { searchParams: Promise<{ brand?: string; item?: string }> }) {
  const { brand = "", item = "" } = await searchParams
  const articles = (await getArticlesByContentType("SNAP")).filter((article) => matchesSnapFilter(article, brand, item))
  return <main className="mx-auto max-w-6xl px-4 py-10">
    <header className="mb-8 max-w-2xl"><p className="mb-2 text-xs font-black tracking-[0.24em] text-accent">EDITORIAL SNAP</p><h1 className="mb-3 text-3xl font-black">編集部スナップ</h1><p className="text-sm leading-relaxed text-muted-foreground">編集部が撮影・掲載許可を確認した、街のリアルな着こなしと愛用品を届けます。</p></header>
    <form className="mb-8 grid gap-3 rounded-xl border border-border bg-secondary/30 p-4 sm:grid-cols-[1fr_1fr_auto]">
      <input name="brand" defaultValue={brand} placeholder="ブランドで絞り込み" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <input name="item" defaultValue={item} placeholder="アイテムで絞り込み" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <button className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">絞り込む</button>
    </form>
    {articles.length > 0 ? <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">{articles.map((article, index) => <ArticleCard key={article.id} article={article} priority={index < 3} />)}</div> : <div className="rounded-xl border border-dashed border-border p-10 text-sm text-muted-foreground">該当するスナップはまだありません。</div>}
  </main>
}
