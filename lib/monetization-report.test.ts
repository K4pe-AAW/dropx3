import assert from "node:assert/strict"
import test from "node:test"
import { buildMonetizationReport, renderMonetizationMarkdown } from "./monetization-report"
import type { Article, Draft } from "./types"

const baseArticle: Article = {
  id: "article-1", slug: "article-1", title: "商品A", excerpt: "", bodyParagraphs: ["本文"],
  coverImage: "/a.jpg", coverImageAlt: "", galleryImages: [], category: "sneaker", brands: ["A"], tags: [],
  publishedAt: "2026-09-24T00:00:00.000Z", featured: false, affiliateLinks: [], officialLinks: [], sourceRefs: [],
}

const baseDraft: Draft = {
  id: "draft-1", status: "pending", title: "商品B", excerpt: "", bodyParagraphs: ["本文"], category: "sneaker",
  brands: ["B"], tags: [], suggestedAffiliateSearch: ["商品B 型番"], sourceRefs: [], createdAt: "2026-09-20T00:00:00.000Z",
}

test("収益導線の不足と古い下書きを候補化する", () => {
  const report = buildMonetizationReport([baseArticle], [baseDraft], new Map(), new Date("2026-09-25T00:00:00.000Z"))
  assert.equal(report.affiliateCoverage, 0)
  assert.equal(report.staleDrafts, 1)
  assert.equal(report.opportunities.some((item) => item.kind === "published_without_affiliate"), true)
  assert.equal(report.opportunities.some((item) => item.kind === "stale_draft"), true)
})

test("Obsidian向けMarkdownにKPIとタスクを出力する", () => {
  const report = buildMonetizationReport([baseArticle], [baseDraft], new Map(), new Date("2026-09-25T00:00:00.000Z"))
  const markdown = renderMonetizationMarkdown(report)
  assert.match(markdown, /Monetization Dashboard/)
  assert.match(markdown, /アフィリエイト導線のある記事/)
  assert.match(markdown, /- \[ \]/)
})
