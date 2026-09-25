import assert from "node:assert/strict"
import test from "node:test"
import { recentNewsArticles, renderNewsSitemap } from "./news-sitemap"
import type { Article } from "./types"

function article(id: string, publishedAt: string): Article {
  return { id, slug: id, title: `A&B ${id}`, excerpt: "", bodyParagraphs: [], coverImage: "/a.jpg", coverImageAlt: "", galleryImages: [], category: "news", brands: [], tags: [], publishedAt, featured: false, affiliateLinks: [], officialLinks: [], sourceRefs: [] }
}

test("ニュースサイトマップには直近2日だけを含める", () => {
  const now = new Date("2026-09-25T12:00:00.000Z")
  const recent = recentNewsArticles([
    article("new", "2026-09-24T12:00:00.000Z"),
    article("old", "2026-09-22T11:59:59.000Z"),
  ], now)
  assert.deepEqual(recent.map((item) => item.id), ["new"])
})

test("ニュースサイトマップを正しい名前空間とXMLエスケープで出力する", () => {
  const value = renderNewsSitemap([article("new", "2026-09-24T12:00:00.000Z")], { siteUrl: "https://dropx3.com", publicationName: "DROP DROP DROP" })
  assert.match(value, /xmlns:news=/)
  assert.match(value, /A&amp;B new/)
})
