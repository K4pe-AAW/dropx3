import type { Metadata } from "next"
import { getAllArticles } from "@/lib/storage"
import { ArticleCard } from "@/components/ArticleCard"
import { Pagination } from "@/components/Pagination"
import { SearchSubmitTracker } from "@/components/SearchSubmitTracker"
import { TrackedLink } from "@/components/TrackedLink"

const PAGE_SIZE = 12

export const metadata: Metadata = { title: "記事を探す" }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams
  const query = (q ?? "").trim()
  const all = query ? await getAllArticles() : []
  const results = query
    ? all.filter((a) => {
        const haystack = `${a.title} ${a.excerpt} ${a.brands.join(" ")} ${a.tags.join(" ")}`.toLowerCase()
        return haystack.includes(query.toLowerCase())
      })
    : []

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const list = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

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

      {query && <SearchSubmitTracker query={query} resultCount={results.length} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
        {list.map((a, i) => (
          <TrackedLink
            key={a.id}
            event="search_result_select"
            params={{ search_term: query, result_position: (currentPage - 1) * PAGE_SIZE + i, article_id: a.id }}
          >
            <ArticleCard article={a} />
          </TrackedLink>
        ))}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/search" extraParams={{ q: query }} />
    </div>
  )
}
