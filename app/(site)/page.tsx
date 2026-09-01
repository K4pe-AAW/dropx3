import { getAllArticles, getFeaturedArticles, getAllBrands, getArchiveMonths } from "@/lib/storage"
import { ArticleCard } from "@/components/ArticleCard"
import { Sidebar } from "@/components/Sidebar"
import { Pagination } from "@/components/Pagination"
import { siteConfig } from "@/lib/site-config"
import Link from "next/link"

const PAGE_SIZE = 12

function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString()
}

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
  const columns = all.filter((article) => article.contentType === "COLUMN").slice(0, 3)
  const picks = all.filter((article) => article.contentType === "PICKS").slice(0, 3)
  const snaps = all.filter((article) => article.contentType === "SNAP").slice(0, 3)

  // トップが何のサイトかを機械に伝える。記事ページ側と違い、ここには
  // 個別のArticleが無いのでサイト自体を主語にする。
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: siteConfig.name,
        description: siteConfig.description,
        url: absoluteUrl("/"),
        publisher: { "@type": "Organization", name: siteConfig.name, url: absoluteUrl("/") },
      },
      {
        "@type": "CollectionPage",
        name: siteConfig.name,
        description: siteConfig.description,
        url: absoluteUrl("/"),
        // 一覧に出している記事を明示する。AI検索は「このページに何があるか」を
        // ここから読むので、本文のカードだけに任せない
        mainEntity: {
          "@type": "ItemList",
          itemListElement: list.map((a, i) => ({
            "@type": "ListItem",
            position: (currentPage - 1) * PAGE_SIZE + i + 1,
            url: absoluteUrl(`/articles/${a.slug}`),
            name: a.title,
          })),
        },
      },
    ],
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/*
        トップにh1が無く、機械から見て「何のページか」が分からない状態だった。
        見た目はヘッダのロゴが担っているので、視覚的には出さずに見出しだけ置く。
        2ページ目以降は内容が違うので、同じ見出しにしない。
      */}
      <h1 className="sr-only">
        {currentPage === 1
          ? `${siteConfig.name}｜${siteConfig.tagline}`
          : `${siteConfig.name}｜記事一覧 ${currentPage}ページ目`}
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
        <div>
          {currentPage === 1 && columns.length > 0 && (
            <EditorialSection title="編集部コラム" eyebrow="COLUMN" href="/column" articles={columns} />
          )}
          {currentPage === 1 && picks.length > 0 && (
            <EditorialSection title="編集部おすすめ品" eyebrow="EDITOR’S PICKS" href="/picks" articles={picks} />
          )}
          {currentPage === 1 && snaps.length > 0 && (
            <EditorialSection title="編集部スナップ" eyebrow="EDITORIAL SNAP" href="/snap" articles={snaps} />
          )}
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black tracking-[0.22em] text-accent">LATEST</p>
              <h2 className="text-xl font-black">最新記事</h2>
            </div>
          </div>
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

function EditorialSection({
  title,
  eyebrow,
  href,
  articles,
}: {
  title: string
  eyebrow: string
  href: string
  articles: Awaited<ReturnType<typeof getAllArticles>>
}) {
  return (
    <section className="mb-12 rounded-2xl border border-border bg-secondary/30 p-5 sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black tracking-[0.22em] text-accent">{eyebrow}</p>
          <h2 className="text-xl font-black">{title}</h2>
        </div>
        <Link href={href} className="text-xs font-bold underline decoration-2 underline-offset-4">
          すべて見る
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
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
