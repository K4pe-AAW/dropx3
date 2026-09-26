import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { ArticleCard } from "@/components/ArticleCard"
import { Pagination } from "@/components/Pagination"
import { Sidebar } from "@/components/Sidebar"
import { SEO_TOPICS, matchesSeoTopic, seoTopicBySlug } from "@/lib/seo-topics"
import { siteConfig } from "@/lib/site-config"
import { getAllArticles, getAllBrands, getArchiveMonths, getPopularArticles } from "@/lib/storage"

export const dynamic = "force-dynamic"
const PAGE_SIZE = 12

export function generateStaticParams() {
  return SEO_TOPICS.map((topic) => ({ tag: topic.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params
  const topic = seoTopicBySlug(tag)
  if (!topic) return {}
  const url = new URL(`/tag/${topic.slug}`, siteConfig.url).toString()
  return {
    title: topic.title,
    description: topic.description,
    alternates: { canonical: url },
    openGraph: { title: topic.title, description: topic.description, url, type: "website" },
  }
}

export default async function SeoTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ tag }, { page }] = await Promise.all([params, searchParams])
  const topic = seoTopicBySlug(tag)
  if (!topic) notFound()

  const all = (await getAllArticles()).filter((article) => matchesSeoTopic(article, topic.slug))
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const articles = all.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const [brands, archive, popular] = await Promise.all([getAllBrands(), getArchiveMonths(), getPopularArticles(6)])

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 sm:py-8">
      <header className="mb-6 max-w-3xl sm:mb-8">
        <p className="text-xs font-black tracking-[0.2em] text-muted-foreground">TOPIC</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">{topic.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{topic.intro}</p>
        {topic.slug.endsWith("s-style") && (
          <Link href="/style-by-age" className="mt-4 inline-flex text-sm font-bold underline underline-offset-4">
            ほかの年代のスタイルも見る
          </Link>
        )}
      </header>
      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[1fr_300px] lg:gap-10">
        <div>
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当する記事を準備中です。</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 sm:gap-y-8 xl:grid-cols-3">
                {articles.map((article, index) => <ArticleCard key={article.id} article={article} priority={index < 3} />)}
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} basePath={`/tag/${topic.slug}`} />
            </>
          )}
        </div>
        <Sidebar popular={popular} brands={brands} archive={archive} />
      </div>
    </main>
  )
}
