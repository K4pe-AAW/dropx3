import type { Article } from "./types"

type JsonLdNode = Record<string, unknown>

function absoluteUrl(raw: string, siteUrl: string): string {
  return new URL(raw, siteUrl).toString()
}

function parseJpyPrice(raw: string | undefined): number | null {
  if (!raw) return null
  const normalized = raw
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replace(/，/g, ",")
  const currencyMatch = normalized.match(/[¥￥]\s*([\d,]+)/)
    ?? normalized.match(/([\d,]+)\s*(?:円|JPY)/i)
    ?? normalized.match(/(\d{1,3}(?:,\d{3})+)/)
  if (!currencyMatch) return null
  const price = Number(currencyMatch[1].replace(/,/g, ""))
  return Number.isSafeInteger(price) && price > 0 ? price : null
}

/**
 * DROP DROP DROPは販売店ではないため、通常のNEWSを商品販売ページとしてマークアップしない。
 * BUY/PICKSのうち、画像・ブランド・単一の確定価格が揃う1商品記事だけを
 * 非販売者向けのProduct snippet候補として扱う。
 */
export function buildEditorialProductNode(article: Article, articleUrl: string, siteUrl: string): JsonLdNode | null {
  if (article.contentType !== "BUY" && article.contentType !== "PICKS") return null
  if (!article.coverImage || article.brands.length === 0) return null

  const pricedColorways = (article.colorways ?? [])
    .map((colorway) => ({ colorway, price: parseJpyPrice(colorway.price) }))
    .filter((entry): entry is { colorway: (NonNullable<Article["colorways"]>)[number]; price: number } => entry.price !== null)
  const prices = [...new Set(pricedColorways.map((entry) => entry.price))]
  if (prices.length !== 1) return null

  const styleCodes = [
    ...new Set(pricedColorways.map((entry) => entry.colorway.styleCode?.trim()).filter((value): value is string => Boolean(value))),
  ]

  return {
    "@type": "Product",
    "@id": `${articleUrl}#product`,
    name: article.title,
    description: article.excerpt,
    image: [absoluteUrl(article.coverImage, siteUrl)],
    brand: { "@type": "Brand", name: article.brands[0] },
    ...(styleCodes.length === 1 ? { sku: styleCodes[0], mpn: styleCodes[0] } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "JPY",
      price: prices[0],
      url: articleUrl,
    },
  }
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

  const productNode = buildEditorialProductNode(article, articleUrl, siteUrl)

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
      ...(productNode ? [productNode] : []),
    ],
  }
}
