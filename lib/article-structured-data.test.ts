import assert from "node:assert/strict"
import test from "node:test"
import { buildArticleStructuredData } from "./article-structured-data"
import type { Article } from "./types"

function article(overrides: Partial<Article> = {}): Article {
  return {
    id: "article-1",
    slug: "sample-product",
    title: "Sample Brandの新作スニーカー",
    excerpt: "新作スニーカーの価格と発売情報を紹介。",
    bodyParagraphs: ["本文"],
    coverImage: "/images/sample.webp",
    coverImageAlt: "Sample Brandの新作スニーカー",
    galleryImages: [{ url: "/images/sample-detail.webp", alt: "ディテール" }],
    category: "sneaker",
    contentType: "NEWS",
    brands: ["Sample Brand"],
    tags: ["新作", "スニーカー"],
    publishedAt: "2026-09-10T00:00:00.000Z",
    featured: false,
    colorways: [{ colorName: "Black", price: "19,800円（税込）", styleCode: "ABC-001" }],
    affiliateLinks: [],
    officialLinks: [],
    sourceRefs: [],
    ...overrides,
  }
}

test("Article、組織、サイト、パンくずを関連付けて出力する", () => {
  const data = buildArticleStructuredData(article(), {
    siteUrl: "https://dropx3.com",
    siteName: "DROP DROP DROP",
    categoryName: "スニーカー",
  })
  const types = data["@graph"].map((node) => node["@type"])
  assert.deepEqual(types, ["Organization", "WebSite", "Article", "BreadcrumbList"])
  const articleNode = data["@graph"].find((node) => node["@type"] === "Article")
  assert.deepEqual(articleNode?.image, [
    "https://dropx3.com/images/sample.webp",
    "https://dropx3.com/images/sample-detail.webp",
  ])
  assert.equal(articleNode?.inLanguage, "ja-JP")
  assert.equal(articleNode?.articleSection, "スニーカー")
  assert.equal(articleNode?.keywords, "Sample Brand, 新作, スニーカー")
})

test("BUY/PICKSでも販売者リスティングを誘発するProduct/Offerを出さない", () => {
  for (const contentType of ["BUY", "PICKS"] as const) {
    const data = buildArticleStructuredData(article({ contentType }), {
      siteUrl: "https://dropx3.com",
      siteName: "DROP DROP DROP",
      categoryName: "スニーカー",
    })
    assert.equal(data["@graph"].some((node) => node["@type"] === "Product"), false)
    assert.equal(data["@graph"].some((node) => node["@type"] === "Offer"), false)
  }
})
