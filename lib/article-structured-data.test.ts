import assert from "node:assert/strict"
import test from "node:test"
import { buildArticleStructuredData, buildEditorialProductNode } from "./article-structured-data"
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

test("NEWSは価格表示データがあってもProduct構造化データを出さない", () => {
  const node = buildEditorialProductNode(article(), "https://dropx3.com/articles/sample-product", "https://dropx3.com")
  assert.equal(node, null)
})

test("BUYは画像・ブランド・単一価格が揃う場合だけProductを1件出す", () => {
  const node = buildEditorialProductNode(
    article({ contentType: "BUY" }),
    "https://dropx3.com/articles/sample-product",
    "https://dropx3.com"
  )
  assert.equal(node?.["@type"], "Product")
  assert.deepEqual(node?.image, ["https://dropx3.com/images/sample.webp"])
  assert.deepEqual(node?.brand, { "@type": "Brand", name: "Sample Brand" })
  assert.deepEqual(node?.offers, {
    "@type": "Offer",
    priceCurrency: "JPY",
    price: 19800,
    url: "https://dropx3.com/articles/sample-product",
  })
})

test("BUYでもカラーごとに価格が異なる場合は不完全なProductを出さない", () => {
  const node = buildEditorialProductNode(
    article({
      contentType: "BUY",
      colorways: [
        { colorName: "Black", price: "19,800円" },
        { colorName: "Special", price: "22,000円" },
      ],
    }),
    "https://dropx3.com/articles/sample-product",
    "https://dropx3.com"
  )
  assert.equal(node, null)
})

test("PICKSでも価格が無い場合はProductを出さない", () => {
  const node = buildEditorialProductNode(
    article({ contentType: "PICKS", colorways: [{ colorName: "Black" }] }),
    "https://dropx3.com/articles/sample-product",
    "https://dropx3.com"
  )
  assert.equal(node, null)
})

test("価格欄に発売年だけが入っていても価格と誤認しない", () => {
  const node = buildEditorialProductNode(
    article({ contentType: "BUY", colorways: [{ colorName: "Black", price: "2026年発売" }] }),
    "https://dropx3.com/articles/sample-product",
    "https://dropx3.com"
  )
  assert.equal(node, null)
})

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
