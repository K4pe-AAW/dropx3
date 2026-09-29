import assert from "node:assert/strict"
import test from "node:test"
import { buildSocialPostDrafts } from "./social-promotion"
import { siteConfig } from "./site-config"
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

test("Goss!pとリークは未確認表示を残して自動投稿候補にする", () => {
  const [rumor] = buildSocialPostDrafts([article({ informationStatus: "rumor" })], new Date("2026-09-28T03:00:00.000Z"))
  const [leak] = buildSocialPostDrafts([article({ informationStatus: "leak" })], new Date("2026-09-28T03:00:00.000Z"))
  assert.match(rumor.text, /^Goss!p・未確認｜/)
  assert.match(leak.text, /^リーク・未確認｜/)
})

test("同一記事は同じJST日では同じID、翌日は別IDになる", () => {
  const [first] = buildSocialPostDrafts([article()], new Date("2026-09-27T03:00:00.000Z"))
  const [sameDay] = buildSocialPostDrafts([article()], new Date("2026-09-27T12:00:00.000Z"))
  const [nextDay] = buildSocialPostDrafts([article()], new Date("2026-09-28T03:00:00.000Z"))
  assert.equal(first.id, sameDay.id)
  assert.notEqual(first.id, nextDay.id)
})

test("画像URLはTypefullyから取得できる絶対URLにする", () => {
  const [draft] = buildSocialPostDrafts([article()], new Date("2026-09-28T03:00:00.000Z"))
  assert.equal(draft.imageUrl, new URL("/sample.jpg", siteConfig.url).toString())
})

test("具体情報のない新着は候補にしない", () => {
  const value = article({ colorways: undefined, purchaseChannels: undefined, officialLinks: [] })
  assert.equal(buildSocialPostDrafts([value], new Date("2026-09-27T03:00:00.000Z")).length, 0)
})

test("同じ種類では公開・更新時刻が新しい記事を優先する", () => {
  const older = article({ id: "older", slug: "older", publishedAt: "2026-09-27T00:00:00.000Z" })
  const newer = article({ id: "newer", slug: "newer", publishedAt: "2026-09-27T02:00:00.000Z" })
  const drafts = buildSocialPostDrafts([older, newer], new Date("2026-09-27T03:00:00.000Z"))
  assert.deepEqual(drafts.map((draft) => draft.articleId), ["newer", "older"])
})

test("更新記事は更新時刻が新しい順に並べる", () => {
  const older = article({
    id: "older-update",
    slug: "older-update",
    publishedAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-27T01:00:00.000Z",
  })
  const newer = article({
    id: "newer-update",
    slug: "newer-update",
    publishedAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-27T02:00:00.000Z",
  })
  const drafts = buildSocialPostDrafts([older, newer], new Date("2026-09-27T03:00:00.000Z"))
  assert.deepEqual(drafts.map((draft) => draft.articleId), ["newer-update", "older-update"])
})
