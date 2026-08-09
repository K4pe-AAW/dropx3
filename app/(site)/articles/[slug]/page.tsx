import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { getArticleBySlug, getRelatedArticles } from "@/lib/storage"
import { PurchaseLinks } from "@/components/PurchaseLinks"
import { ArticleCard } from "@/components/ArticleCard"
import { YouTubeEmbed } from "@/components/YouTubeEmbed"
import { QuoteBlock } from "@/components/QuoteBlock"
import { Badge } from "@/components/ui/badge"
import { categoryLabel } from "@/lib/site-config"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) return {}
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: [article.coverImage],
      type: "article",
      publishedTime: article.publishedAt,
    },
  }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const related = await getRelatedArticles(article, 4)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <nav className="text-xs text-muted-foreground mb-4 flex flex-wrap gap-1.5 items-center">
        <Link href="/" className="hover:text-foreground">
          TOP
        </Link>
        <span>/</span>
        <Link href={`/category/${article.category}`} className="hover:text-foreground">
          {categoryLabel(article.category)}
        </Link>
      </nav>

      {article.brands.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {article.brands.map((b) => (
            <Link key={b} href={`/brand/${encodeURIComponent(b)}`}>
              <Badge variant="default">{b}</Badge>
            </Link>
          ))}
        </div>
      )}

      <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-3 text-balance">{article.title}</h1>
      <p className={`text-sm text-muted-foreground ${article.affiliateLinks.length > 0 ? "mb-1" : "mb-6"}`}>
        {formatDate(article.publishedAt)}
      </p>
      {article.affiliateLinks.length > 0 && (
        <p className="text-xs text-muted-foreground/70 mb-6">本ページはプロモーションが含まれています</p>
      )}

      {article.youtubeVideoId ? (
        <div className="mb-8">
          <YouTubeEmbed videoId={article.youtubeVideoId} title={article.title} />
        </div>
      ) : (
        <div className="relative aspect-[4/3] sm:aspect-[16/9] overflow-hidden rounded-xl bg-muted mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.coverImage} alt={article.coverImageAlt} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="space-y-5 text-[15px] leading-[1.9]">
        {article.bodyParagraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {article.quote && <QuoteBlock text={article.quote.text} sourceLabel={article.quote.sourceLabel} />}

      {article.galleryImages.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-8">
          {article.galleryImages.map((img, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} loading="lazy" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <PurchaseLinks officialLinks={article.officialLinks} affiliateLinks={article.affiliateLinks} />

      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
          {article.tags.map((t) => (
            <span key={t} className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
              #{t}
            </span>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="text-lg font-bold mb-5">関連記事</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
