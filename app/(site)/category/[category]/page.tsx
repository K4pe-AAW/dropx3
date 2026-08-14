import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getArticlesByCategory, getAllBrands, getArchiveMonths, getFeaturedArticles } from "@/lib/storage"
import { ArticleCard } from "@/components/ArticleCard"
import { Sidebar } from "@/components/Sidebar"
import { Pagination } from "@/components/Pagination"
import { siteConfig } from "@/lib/site-config"

const PAGE_SIZE = 12

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const found = siteConfig.categories.find((c) => c.slug === category)
  if (!found) return {}
  return {
    title: `${found.label}の記事一覧`,
    alternates: { canonical: new URL(`/category/${category}`, siteConfig.url).toString() },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { category } = await params
  const { page } = await searchParams
  const found = siteConfig.categories.find((c) => c.slug === category)
  if (!found) notFound()

  const articles = await getArticlesByCategory(category)
  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const list = articles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const brands = await getAllBrands()
  const archive = await getArchiveMonths()
  const popular = await getFeaturedArticles(6)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-black mb-6">{found.label}の記事一覧</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
        <div>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ記事がありません。</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
                {list.map((a, i) => (
                  <ArticleCard key={a.id} article={a} priority={i < 3} />
                ))}
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} basePath={`/category/${category}`} />
            </>
          )}
        </div>
        <Sidebar popular={popular} brands={brands} archive={archive} />
      </div>
    </div>
  )
}
