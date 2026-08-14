import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getAllArticles, getAllBrands, getArchiveMonths, getFeaturedArticles } from "@/lib/storage"
import { ArticleCard } from "@/components/ArticleCard"
import { Sidebar } from "@/components/Sidebar"
import { Pagination } from "@/components/Pagination"
import { siteConfig } from "@/lib/site-config"

const PAGE_SIZE = 15

function monthLabel(key: string) {
  const [y, m] = key.split("-")
  return `${y}年${Number(m)}月`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ month: string }>
}): Promise<Metadata> {
  const { month } = await params
  return {
    title: `${monthLabel(month)}の記事一覧`,
    alternates: { canonical: new URL(`/archive/${month}`, siteConfig.url).toString() },
  }
}

export default async function ArchiveMonthPage({
  params,
  searchParams,
}: {
  params: Promise<{ month: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { month } = await params
  const { page } = await searchParams
  if (!/^\d{4}-\d{2}$/.test(month)) notFound()

  const allArticles = await getAllArticles()
  const articles = allArticles.filter((a) => a.publishedAt.slice(0, 7) === month)
  if (articles.length === 0) notFound()

  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const list = articles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const brands = await getAllBrands()
  const archive = await getArchiveMonths()
  const popular = await getFeaturedArticles(6)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-black mb-6">{monthLabel(month)}の記事一覧</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
            {list.map((a, i) => (
              <ArticleCard key={a.id} article={a} priority={i < 3} />
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} basePath={`/archive/${month}`} />
        </div>
        <Sidebar popular={popular} brands={brands} archive={archive} />
      </div>
    </div>
  )
}
