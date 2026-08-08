import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getArticlesByBrand, getAllBrands, getArchiveMonths, getFeaturedArticles } from "@/lib/storage"
import { ArticleCard } from "@/components/ArticleCard"
import { Sidebar } from "@/components/Sidebar"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>
}): Promise<Metadata> {
  const { brand } = await params
  return { title: `${decodeURIComponent(brand)}の記事一覧` }
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brand: string }>
}) {
  const { brand } = await params
  const name = decodeURIComponent(brand)
  const articles = await getArticlesByBrand(brand)
  if (articles.length === 0) notFound()

  const brands = await getAllBrands()
  const archive = await getArchiveMonths()
  const popular = await getFeaturedArticles(6)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-black mb-6">
        <span className="text-muted-foreground font-normal">ブランド：</span>
        {name}
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
          {articles.map((a, i) => (
            <ArticleCard key={a.id} article={a} priority={i < 3} />
          ))}
        </div>
        <Sidebar popular={popular} brands={brands} archive={archive} />
      </div>
    </div>
  )
}
