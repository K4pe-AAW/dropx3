import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { getArticleBySlug, getRelatedArticles } from "@/lib/storage"
import { PurchaseLinks } from "@/components/PurchaseLinks"
import { PurchaseChannelsSection } from "@/components/PurchaseChannelsSection"
import { RelatedArticleLinks } from "@/components/RelatedArticleLinks"
import { OfficialProductWidget } from "@/components/OfficialProductWidget"
import { ArticleCard } from "@/components/ArticleCard"
import { ArticleBody } from "@/components/ArticleBody"
import { YouTubeEmbed } from "@/components/YouTubeEmbed"
import { QuoteBlock } from "@/components/QuoteBlock"
import { TrackedLink } from "@/components/TrackedLink"
import { Badge } from "@/components/ui/badge"
import { categoryLabel, siteConfig } from "@/lib/site-config"
import { linkDomain } from "@/lib/analytics"
import { INFORMATION_STATUS_LABELS, isUnconfirmedStatus, unconfirmedNotice } from "@/lib/information-status"
import { CONTENT_TYPE_LABELS, isEditorialContentType } from "@/lib/content-type"

function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) return {}
  const url = absoluteUrl(`/articles/${article.slug}`)
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: url },
    robots: { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: [article.coverImage],
      type: "article",
      publishedTime: article.publishedAt,
      url,
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
  const articleUrl = absoluteUrl(`/articles/${article.slug}`)
  const coverImageUrl = absoluteUrl(article.coverImage)

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.excerpt,
        image: [coverImageUrl],
        datePublished: article.publishedAt,
        dateModified: article.updatedAt || article.publishedAt,
        author: article.editorialAuthor
          ? { "@type": "Person", name: article.editorialAuthor }
          : { "@type": "Organization", name: siteConfig.name },
        publisher: { "@type": "Organization", name: siteConfig.name },
        mainEntityOfPage: articleUrl,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "TOP", item: absoluteUrl("/") },
          {
            "@type": "ListItem",
            position: 2,
            name: categoryLabel(article.category),
            item: absoluteUrl(`/category/${article.category}`),
          },
          { "@type": "ListItem", position: 3, name: article.title, item: articleUrl },
        ],
      },
      ...(article.colorways ?? []).map((cw) => ({
        "@type": "Product",
        name: `${article.title} ${cw.colorName}`,
        color: cw.colorName,
        ...(cw.styleCode ? { sku: cw.styleCode, mpn: cw.styleCode } : {}),
        ...(cw.image ? { image: [absoluteUrl(cw.image)] } : {}),
        brand: article.brands.map((b) => ({ "@type": "Brand", name: b })),
        ...(cw.price
          ? {
              offers: {
                "@type": "Offer",
                priceCurrency: "JPY",
                price: (cw.price.match(/[\d,]+/)?.[0] ?? "").replace(/,/g, ""),
                availability: "https://schema.org/PreOrder",
              },
            }
          : {}),
      })),
    ],
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
            <TrackedLink key={b} event="brand_select" params={{ brand: b, placement: "article_badge" }}>
              <Link href={`/brand/${encodeURIComponent(b)}`}>
                <Badge variant="default">{b}</Badge>
              </Link>
            </TrackedLink>
          ))}
        </div>
      )}

      {isEditorialContentType(article.contentType) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="accent">{CONTENT_TYPE_LABELS[article.contentType]}</Badge>
          {article.seriesName && <span className="text-xs font-bold text-muted-foreground">{article.seriesName}</span>}
        </div>
      )}

      <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-3 text-balance text-wrap-phrase">{article.title}</h1>
      <p className={`text-sm text-muted-foreground ${article.affiliateLinks.length > 0 || article.isSponsored ? "mb-1" : "mb-6"}`}>
        {formatDate(article.publishedAt)}
        {article.editorialAuthor && <span> ・ By {article.editorialAuthor}</span>}
      </p>
      {(article.affiliateLinks.length > 0 || article.isSponsored) && (
        <p className="text-xs text-muted-foreground/70 mb-6">本ページはプロモーションが含まれています</p>
      )}

      {isUnconfirmedStatus(article.informationStatus) && (
        <aside className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950">
          <p className="mb-1 text-xs font-black tracking-wide">{INFORMATION_STATUS_LABELS[article.informationStatus]}</p>
          <p className="text-sm leading-relaxed">{unconfirmedNotice(article.informationStatus)}</p>
        </aside>
      )}

      {article.youtubeVideoId ? (
        <div className="mb-8">
          <YouTubeEmbed videoId={article.youtubeVideoId} title={article.title} />
        </div>
      ) : (
        <div className="mb-8">
          <div className="overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- 縦長画像を横長枠にcropせず、実際の縦横比のまま表示する */}
            <img src={article.coverImage} alt={article.coverImageAlt} className="w-full h-auto" />
          </div>
          {article.coverImageCredit && (
            <p className="mt-1 text-[10px] text-muted-foreground/60">{article.coverImageCredit}</p>
          )}
        </div>
      )}

      <ArticleBody
        paragraphs={article.bodyParagraphs}
        articleId={article.id}
        articleTitle={article.title}
        category={article.category}
        brand={article.brands[0]}
        contentType={article.contentType}
      />

      {isUnconfirmedStatus(article.informationStatus) && (
        <p className="mt-8 rounded-xl bg-secondary p-4 text-sm leading-relaxed">
          {unconfirmedNotice(article.informationStatus)}
        </p>
      )}

      {article.quote && <QuoteBlock text={article.quote.text} sourceLabel={article.quote.sourceLabel} />}

      {article.galleryImages.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-8 items-start">
          {article.galleryImages.map((img, i) => (
            <div key={i}>
              <div className="overflow-hidden rounded-xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- 縦長画像を正方形枠にcropせず、実際の縦横比のまま表示する */}
                <img src={img.url} alt={img.alt} loading="lazy" className="w-full h-auto" />
              </div>
              {img.credit && <p className="mt-1 text-[10px] text-muted-foreground/60">{img.credit}</p>}
            </div>
          ))}
        </div>
      )}

      {article.purchaseChannels && article.purchaseChannels.length > 0 && (
        <PurchaseChannelsSection channels={article.purchaseChannels} articleId={article.id} />
      )}

      {article.officialProducts && article.officialProducts.length > 0 && (
        <OfficialProductWidget products={article.officialProducts} brand={article.brands[0]} articleId={article.id} />
      )}

      {article.relatedArticles && article.relatedArticles.length > 0 && (
        <RelatedArticleLinks links={article.relatedArticles} />
      )}

      <PurchaseLinks
        officialLinks={article.officialLinks}
        affiliateLinks={article.affiliateLinks}
        articleId={article.id}
        articleTitle={article.title}
        brand={article.brands[0]}
        contentType={article.contentType}
      />

      {article.sourceRefs.length > 0 && (
        <div className="mt-8 rounded-xl border border-border p-4">
          <h2 className="text-xs font-bold text-muted-foreground mb-2">情報元・参考</h2>
          <ul className="space-y-1">
            {article.sourceRefs.map((ref, i) => (
              <li key={i}>
                <TrackedLink
                  event="outbound_click"
                  params={{
                    link_domain: linkDomain(ref.url),
                    link_url: ref.url,
                    placement: "article_body",
                    article_id: article.id,
                  }}
                >
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    {ref.name}
                  </a>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </div>
      )}

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
