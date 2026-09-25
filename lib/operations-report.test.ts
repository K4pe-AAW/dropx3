import assert from "node:assert/strict"
import test from "node:test"
import { buildOperationsReport } from "./operations-report"
import type { Article, Draft } from "./types"

const baseArticle: Article = {
  id: "a1", slug: "a1", title: "記事", excerpt: "要約", bodyParagraphs: ["本文"],
  coverImage: "/a.jpg", coverImageAlt: "記事", galleryImages: [], category: "sneaker",
  brands: ["NIKE"], tags: [], publishedAt: "2026-09-25T01:00:00.000Z", featured: false,
  affiliateLinks: [], officialLinks: [], sourceRefs: [{ name: "公式", url: "https://example.com/a" }],
}

const baseDraft: Draft = {
  id: "d1", status: "pending", title: "下書き", excerpt: "要約", bodyParagraphs: ["本文"],
  category: "sneaker", brands: [], tags: [], suggestedAffiliateSearch: ["靴"],
  sourceRefs: [{ name: "媒体", url: "https://example.com/d" }], createdAt: "2026-09-22T00:00:00.000Z",
}

test("公開運用レポートは最古下書き・枠の失敗・直近媒体比率を集計する", () => {
  const report = buildOperationsReport(
    [baseArticle, { ...baseArticle, id: "a2", slug: "a2", youtubeVideoId: "video", sourceRefs: [{ name: "YouTube", url: "https://youtube.com/watch?v=video" }] }],
    [baseDraft],
    { runs: { slot: { startedAt: "2026-09-25T00:00:00.000Z", attempts: 2, publishedArticleIds: ["a1"], lastErrors: ["画像不足"] } } },
    "slot",
    new Date("2026-09-25T12:00:00.000Z")
  )
  assert.equal(report.pendingDrafts, 1)
  assert.equal(report.oldestDraftAgeHours, 84)
  assert.equal(report.staleDrafts, 1)
  assert.equal(report.currentSlotPublished, 1)
  assert.equal(report.currentSlotAttempts, 2)
  assert.deepEqual(report.currentSlotErrors, ["画像不足"])
  assert.equal(report.recentYoutube, 1)
  assert.deepEqual(report.sourceCounts, [{ source: "YouTube", count: 1 }, { source: "公式", count: 1 }])
})
