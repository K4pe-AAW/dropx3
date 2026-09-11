import type { Article } from "./types"

type JsonLdNode = Record<string, unknown>

function absoluteUrl(raw: string, siteUrl: string): string {
  return new URL(raw, siteUrl).toString()
}

export function buildArticleStructuredData(
  article: Article,
  options: { siteUrl: string; siteName: string; categoryName: string }
): { "@context": string; "@graph": JsonLdNode[] } {
  const { siteUrl, siteName, categoryName } = options
  const articleUrl = absoluteUrl(`/articles/${article.slug}`, siteUrl)
  const organizationId = `${absoluteUrl("/", siteUrl)}#organization`
  const websiteId = `${absoluteUrl("/", siteUrl)}#website`
  const articleId = `${articleUrl}#article`
  const images = [article.coverImage, ...article.galleryImages.map((image) => image.url)]
    .filter(Boolean)
    .map((image) => absoluteUrl(image, siteUrl))
    .filter((image, index, all) => all.indexOf(image) === index)

  const articleNode: JsonLdNode = {
    "@type": "Article",
    "@id": articleId,
    url: articleUrl,
    headline: article.title,
    description: article.excerpt,
    image: images,
    thumbnailUrl: images[0],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    inLanguage: "ja-JP",
    articleSection: categoryName,
    keywords: [...new Set([...article.brands, ...article.tags])].join(", "),
    author: article.editorialAuthor
      ? { "@type": "Person", name: article.editorialAuthor }
      : { "@id": organizationId },
    publisher: { "@id": organizationId },
    isPartOf: { "@id": websiteId },
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteName,
        url: absoluteUrl("/", siteUrl),
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/apple-icon", siteUrl),
          width: 180,
          height: 180,
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: siteName,
        url: absoluteUrl("/", siteUrl),
        publisher: { "@id": organizationId },
        inLanguage: "ja-JP",
      },
      articleNode,
      {
        "@type": "BreadcrumbList",
        "@id": `${articleUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "TOP", item: absoluteUrl("/", siteUrl) },
          {
            "@type": "ListItem",
            position: 2,
            name: categoryName,
            item: absoluteUrl(`/category/${article.category}`, siteUrl),
          },
          { "@type": "ListItem", position: 3, name: article.title, item: articleUrl },
        ],
      },
    ],
  }
}
