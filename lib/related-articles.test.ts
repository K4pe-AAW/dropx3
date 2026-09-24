import { test } from "node:test"
import assert from "node:assert/strict"
import { rankRelatedArticles, relatedScore } from "./storage"
import type { Article } from "./types"

function article(over: Partial<Article>): Article {
  return {
    id: "id", slug: "slug", title: "t", excerpt: "e", bodyParagraphs: [],
    coverImage: "/c.jpg", coverImageAlt: "a", galleryImages: [],
    category: "sneaker", brands: [], tags: [], publishedAt: "2026-08-01T00:00:00Z",
    featured: false, affiliateLinks: [], officialLinks: [], sourceRefs: [],
    ...over,
  } as Article
}

test("自分自身は関連記事にしない", () => {
  const a = article({ id: "same", brands: ["REGAL"] })
  assert.equal(relatedScore(a, a), 0)
})

test("ブランド一致はカテゴリ一致より強い", () => {
  const base = article({ id: "base", brands: ["REGAL"], category: "boots" })
  const sameBrand = article({ id: "b", brands: ["REGAL"], category: "sneaker" })
  const sameCategory = article({ id: "c", brands: ["NIKE"], category: "boots" })
  assert.ok(relatedScore(base, sameBrand) > relatedScore(base, sameCategory))
})

test("ブランド名の大文字小文字は無視する", () => {
  const base = article({ id: "base", brands: ["DAIWA PIER39"], category: "boots" })
  const other = article({ id: "o", brands: ["daiwa pier39"], category: "sneaker" })
  assert.equal(relatedScore(base, other), 3)
})

test("タグ一致も加点される", () => {
  const base = article({ id: "base", tags: ["ローファー"], category: "boots" })
  const other = article({ id: "o", tags: ["ローファー"], category: "sneaker" })
  assert.equal(relatedScore(base, other), 2)
})

test("ブランド・タグ・カテゴリが全て一致すると合算される", () => {
  const base = article({ id: "base", brands: ["REGAL"], tags: ["ローファー"], category: "boots" })
  const other = article({ id: "o", brands: ["REGAL"], tags: ["ローファー"], category: "boots" })
  assert.equal(relatedScore(base, other), 3 + 2 + 1)
})

test("何も共通しなければ0（関連記事に出さない）", () => {
  const base = article({ id: "base", brands: ["REGAL"], tags: ["ローファー"], category: "boots" })
  const other = article({ id: "o", brands: ["NIKE"], tags: ["スニーカー"], category: "sneaker" })
  assert.equal(relatedScore(base, other), 0)
})

test("関連度のある記事を優先し、余りを新着記事で補う", () => {
  const base = article({ id: "base", brands: ["REGAL"], category: "boots" })
  const related = article({ id: "related", brands: ["REGAL"], publishedAt: "2026-08-01T00:00:00Z" })
  const newest = article({ id: "newest", brands: ["NIKE"], publishedAt: "2026-09-03T00:00:00Z" })
  const older = article({ id: "older", brands: ["adidas"], publishedAt: "2026-09-01T00:00:00Z" })

  assert.deepEqual(
    rankRelatedArticles([newest, older, related, base], base, 3).map((a) => a.id),
    ["related", "newest", "older"]
  )
})

test("関連記事が十分なら無関係な新着を混ぜない", () => {
  const base = article({ id: "base", brands: ["REGAL"], category: "boots" })
  const relatedA = article({ id: "a", brands: ["REGAL"] })
  const relatedB = article({ id: "b", category: "boots" })
  const unrelated = article({ id: "new", brands: ["NIKE"], publishedAt: "2026-09-03T00:00:00Z" })

  assert.deepEqual(rankRelatedArticles([unrelated, relatedA, relatedB, base], base, 2).map((a) => a.id), ["a", "b"])
})
