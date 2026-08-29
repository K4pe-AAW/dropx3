import test from "node:test"
import assert from "node:assert/strict"
import { normalizePublishedArticles } from "./published-article-audit"
import type { Article, ArticlesData } from "./types"

function article(): Article {
  return {
    id: "a",
    slug: "a",
    title: "商品",
    excerpt: "商品",
    bodyParagraphs: ["商品"],
    coverImage: "https://img.example.com/shoe-1200x800.jpg?w=1200",
    coverImageAlt: "商品",
    galleryImages: [
      { url: "https://img.example.com/shoe-300x200.jpg?w=300", alt: "重複" },
      { url: "https://img.example.com/side.jpg", alt: "側面" },
      { url: "https://img.example.com/side.jpg?width=400", alt: "側面重複" },
    ],
    category: "news",
    brands: [],
    tags: [],
    publishedAt: "2026-08-29T00:00:00.000Z",
    featured: false,
    purchaseChannels: [
      { retailerName: "不要な販売リンク", channelType: "official", saleMethod: "regular", url: "https://example.com" },
    ],
    affiliateLinks: [],
    officialLinks: [],
    sourceRefs: [],
  }
}

test("全公開記事から販売方法リンクとカバー・追加画像の重複を除去する", () => {
  const data: ArticlesData = { articles: [article()], lastUpdated: "before" }
  const result = normalizePublishedArticles(data, "after")
  assert.equal(result.updated.length, 1)
  assert.equal(result.removedPurchaseChannels, 1)
  assert.equal(result.removedDuplicateGalleryImages, 2)
  assert.equal(result.data.articles[0].purchaseChannels, undefined)
  assert.deepEqual(result.data.articles[0].galleryImages, [
    { url: "https://img.example.com/side.jpg", alt: "側面" },
  ])
  assert.equal(result.data.articles[0].updatedAt, "after")
})
