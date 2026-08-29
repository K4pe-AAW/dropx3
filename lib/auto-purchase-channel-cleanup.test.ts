import test from "node:test"
import assert from "node:assert/strict"
import type { Article, ArticlesData } from "./types"
import { removeAutoPublishedPurchaseChannels } from "./auto-purchase-channel-cleanup"

function article(id: string, channels = 0): Article {
  return {
    id,
    slug: id,
    title: id,
    excerpt: id,
    bodyParagraphs: [id],
    coverImage: "/images/test.jpg",
    coverImageAlt: id,
    galleryImages: [],
    category: "news",
    brands: [],
    tags: [],
    publishedAt: "2026-08-29T00:00:00.000Z",
    featured: false,
    ...(channels > 0
      ? { purchaseChannels: Array.from({ length: channels }, (_, i) => ({ retailerName: `store-${i}`, channelType: "official" as const, saleMethod: "regular" as const, url: `https://example.com/${i}` })) }
      : {}),
    affiliateLinks: [],
    officialLinks: [],
    sourceRefs: [],
  }
}

test("自動公開履歴にある記事だけ抽選・販売リンクを削除する", () => {
  const data: ArticlesData = { articles: [article("auto", 3), article("manual", 2)], lastUpdated: "before" }
  const result = removeAutoPublishedPurchaseChannels(data, new Set(["auto"]), "after")
  assert.equal(result.removedChannelCount, 3)
  assert.equal(result.cleaned.length, 1)
  assert.equal(result.data.articles[0].purchaseChannels, undefined)
  assert.equal(result.data.articles[1].purchaseChannels?.length, 2)
  assert.equal(result.data.lastUpdated, "after")
})

test("対象リンクが無ければ記事データを変更しない", () => {
  const data: ArticlesData = { articles: [article("auto")], lastUpdated: "before" }
  const result = removeAutoPublishedPurchaseChannels(data, new Set(["auto"]), "after")
  assert.equal(result.data, data)
  assert.equal(result.removedChannelCount, 0)
})
