import assert from "node:assert/strict"
import test from "node:test"
import { buildSocialPostDrafts } from "./social-promotion"
import type { Article } from "./types"

function article(patch: Partial<Article> = {}): Article {
  return {
    id: "article-1",
    slug: "sample",
    title: "New Balance 990v6が2026年9月28日に発売",
    excerpt: "型番と販売情報を確認できる新作スニーカーです。",
    bodyParagraphs: ["2026年9月28日に発売されます。"],
    coverImage: "/sample.jpg",
    coverImageAlt: "sample",
    galleryImages: [],
    category: "sneaker",
    informationStatus: "official",
    brands: ["New Balance"],
    tags: [],
    publishedAt: "2026-09-27T00:00:00.000Z",
    featured: false,
    colorways: [{ colorName: "Gray", releaseDate: "2026年9月28日", styleCode: "U990XX" }],
    affiliateLinks: [],
    officialLinks: [{ label: "公式", url: "https://example.com/product" }],
    sourceRefs: [],
    ...patch,
  }
}

test("発売当日は新着より発売日投稿を優先しUTMを付ける", () => {
  const [draft] = buildSocialPostDrafts([article()], new Date("2026-09-28T03:00:00.000Z"))
  assert.equal(draft.kind, "release_day")
  assert.match(draft.text, /本日発売/)
  assert.match(draft.url, /utm_source=x/)
  assert.ok(draft.text.length <= 280)
})

test("Goss!pとリークは自動投稿候補にしない", () => {
  assert.equal(buildSocialPostDrafts([article({ informationStatus: "rumor" })], new Date("2026-09-28T03:00:00.000Z")).length, 0)
  assert.equal(buildSocialPostDrafts([article({ informationStatus: "leak" })], new Date("2026-09-28T03:00:00.000Z")).length, 0)
})

test("具体情報のない新着は候補にしない", () => {
  const value = article({ colorways: undefined, purchaseChannels: undefined, officialLinks: [] })
  assert.equal(buildSocialPostDrafts([value], new Date("2026-09-27T03:00:00.000Z")).length, 0)
})
