import { getAllArticles, getFeaturedArticles, getAllBrands, getArchiveMonths } from "@/lib/storage"
import { ArticleCard } from "@/components/ArticleCard"
import { Sidebar } from "@/components/Sidebar"
import { Pagination } from "@/components/Pagination"

const PAGE_SIZE = 15

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const all = await getAllArticles()
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const list = all.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const brands = await getAllBrands()
  const archive = await getArchiveMonths()
  const popular = await getFeaturedArticles(6)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
        <div>
          {list.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
                {list.map((a, i) => (
                  <ArticleCard key={a.id} article={a} priority={i < 3} />
                ))}
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/" />
            </>
          )}
        </div>
        <Sidebar popular={popular} brands={brands} archive={archive} />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
      <p className="text-sm leading-relaxed">
        まだ記事がありません。
        <br />
        <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">npm run collect</code>{" "}
        でニュースを収集するか、<code className="text-xs bg-secondary px-1.5 py-0.5 rounded">data/articles.json</code>{" "}
        に直接記事を追加してください。
      </p>
    </div>
  )
}
