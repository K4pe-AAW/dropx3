import assert from "node:assert/strict"
import test from "node:test"
import { buildReleaseCalendar } from "./release-calendar"
import type { Article } from "./types"

const base = {
  id: "a1", slug: "sample", title: "新作", excerpt: "", bodyParagraphs: [], coverImage: "/x.jpg",
  coverImageAlt: "", galleryImages: [], category: "sneaker", brands: ["Nike"], tags: [],
  publishedAt: "2026-09-20T00:00:00+09:00", featured: false, affiliateLinks: [], officialLinks: [], sourceRefs: [],
} as Article

test("構造化された発売日を記事ごとに一度だけ抽出する", () => {
  const items = buildReleaseCalendar([{ ...base, colorways: [{ colorName: "Black", releaseDate: "2026年10月3日発売" }] }])
  assert.equal(items.length, 1)
  assert.equal(items[0].date, "2026-10-03")
})

test("年のない翌年日付を公開日から補う", () => {
  const items = buildReleaseCalendar([{ ...base, publishedAt: "2026-12-20T00:00:00+09:00", bodyParagraphs: ["1月10日に発売する。"] }])
  assert.equal(items[0].date, "2027-01-10")
})
