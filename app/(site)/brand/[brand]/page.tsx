import { notFound, permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import { getArticlesByBrand, getAllBrands, getArchiveMonths, getPopularArticles } from "@/lib/storage"
import { ArticleCard } from "@/components/ArticleCard"
import { Sidebar } from "@/components/Sidebar"
import { Pagination } from "@/components/Pagination"
import { siteConfig } from "@/lib/site-config"
import { canonicalBrandName } from "@/lib/brands"
import { getBrandHubProfile } from "@/lib/brand-hubs"
import { buildReleaseCalendar } from "@/lib/release-calendar"
import { serializeJsonLd } from "@/lib/json-ld"
import Link from "next/link"

const PAGE_SIZE = 12

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>
}): Promise<Metadata> {
  const { brand } = await params
  const canonicalName = canonicalBrandName(decodeURIComponent(brand))
  const profile = getBrandHubProfile(canonicalName)
  return {
    title: profile ? `${canonicalName} 新作・発売日・関連記事` : `${canonicalName}の記事一覧`,
    description: profile?.summary,
    alternates: { canonical: new URL(`/brand/${encodeURIComponent(canonicalName)}`, siteConfig.url).toString() },
  }
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { brand } = await params
  const { page } = await searchParams
  const name = decodeURIComponent(brand)
  const canonicalName = canonicalBrandName(name)
  if (name !== canonicalName) {
    const suffix = Number(page) > 1 ? `?page=${Number(page)}` : ""
    permanentRedirect(`/brand/${encodeURIComponent(canonicalName)}${suffix}`)
  }
  const articles = await getArticlesByBrand(brand)
  if (articles.length === 0) notFound()

  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const list = articles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const brands = await getAllBrands()
  const archive = await getArchiveMonths()
  const popular = await getPopularArticles(6)
  const profile = getBrandHubProfile(canonicalName)
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date())
  const upcoming = buildReleaseCalendar(articles)
    .filter((item) => item.date >= today)
    .slice(0, 5)
  const pageUrl = new URL(`/brand/${encodeURIComponent(canonicalName)}`, siteConfig.url).toString()
  const jsonLd = profile ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${canonicalName} 新作・発売日・関連記事`,
    description: profile.summary,
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.slice(0, 12).map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: article.title,
        url: new URL(`/articles/${article.slug}`, siteConfig.url).toString(),
      })),
    },
  } : null

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />}
      {profile ? (
        <header className="mb-6 rounded-2xl border border-border bg-secondary/30 p-5 sm:mb-8 sm:p-7">
          <p className="text-[10px] font-black tracking-[0.22em] text-accent">BRAND GUIDE</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{canonicalName} 新作・発売日</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{profile.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.focus.map((item) => <span key={item} className="rounded-full bg-background px-3 py-1 text-xs font-bold">{item}</span>)}
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
            <a href={profile.officialUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-2 underline-offset-4">公式サイトを確認</a>
            <Link href={`/calendar?brand=${encodeURIComponent(canonicalName)}`} className="underline decoration-2 underline-offset-4">発売カレンダーを見る</Link>
          </div>
        </header>
      ) : (
        <h1 className="mb-4 text-xl font-black sm:mb-6">
          <span className="text-muted-foreground font-normal">ブランド：</span>
          {canonicalName}
        </h1>
      )}
      {profile && upcoming.length > 0 && (
        <section className="mb-6 rounded-2xl border border-border p-5 sm:mb-8">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black tracking-[0.22em] text-accent">UPCOMING</p>
              <h2 className="text-lg font-black">今後の発売予定</h2>
            </div>
            <Link href={`/calendar?brand=${encodeURIComponent(canonicalName)}`} className="text-xs font-bold underline underline-offset-4">すべて見る</Link>
          </div>
          <ul className="divide-y divide-border">
            {upcoming.map(({ date, article }) => (
              <li key={`${date}:${article.id}`} className="grid gap-1 py-3 sm:grid-cols-[120px_1fr]">
                <time dateTime={date} className="text-sm font-black">{date.replaceAll("-", ".")}</time>
                <Link href={`/articles/${article.slug}`} className="text-sm font-bold hover:underline">{article.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[1fr_300px] lg:gap-10">
        <div>
          {profile && <h2 className="mb-4 text-xl font-black">{canonicalName}の最新記事</h2>}
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 sm:gap-y-8 xl:grid-cols-3">
            {list.map((a, i) => (
              <ArticleCard key={a.id} article={a} priority={i < 3} />
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} basePath={`/brand/${brand}`} />
        </div>
        <Sidebar popular={popular} brands={brands} archive={archive} />
      </div>
    </div>
  )
}
