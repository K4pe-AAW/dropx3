import type { Metadata } from "next"
import { getAllArticles } from "@/lib/storage"
import { ArticleCard } from "@/components/ArticleCard"

export const metadata: Metadata = { title: "記事を探す" }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? "").trim()
  const results = query
    ? getAllArticles().filter((a) => {
        const haystack = `${a.title} ${a.excerpt} ${a.brands.join(" ")} ${a.tags.join(" ")}`.toLowerCase()
        return haystack.includes(query.toLowerCase())
      })
    : []

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <form action="/search" method="get" className="mb-8 flex gap-2 max-w-md">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="キーワードで記事を探す"
          className="flex-1 h-11 rounded-full border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
        >
          検索
        </button>
      </form>

      {query && (
        <p className="text-sm text-muted-foreground mb-6">
          「{query}」の検索結果：{results.length}件
        </p>
      )}

      {query && results.length === 0 && (
        <p className="text-sm text-muted-foreground">該当する記事が見つかりませんでした。</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
        {results.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  )
}
