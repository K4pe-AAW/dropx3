import { test } from "node:test"
import assert from "node:assert/strict"
import { addDistinctShopArticle, normalizePostUrl } from "./shop-update"
import type { Article, ArticlesData } from "./types"

function article(id: string, postUrl: string): Article {
  return {
    id,
    slug: `article-${id}`,
    title: `記事${id}`,
    excerpt: "概要",
    bodyParagraphs: ["本文"],
    coverImage: `/images/${id}.jpg`,
    coverImageAlt: `画像${id}`,
    galleryImages: [],
    category: "vintage",
    contentType: "NEWS",
    brands: ["ROOM"],
    tags: ["古着"],
    publishedAt: "2026-09-06T10:00:00.000Z",
    featured: false,
    affiliateLinks: [],
    officialLinks: [],
    sourceRefs: [{ name: "ROOM 公式Instagram", url: postUrl }],
  }
}

test("normalizePostUrl: img_indexやlocaleのクエリを除去する", () => {
  assert.equal(
    normalizePostUrl("https://www.instagram.com/p/Db7qxljEwKF/?locale=ja_JP&img_index=2"),
    "https://www.instagram.com/p/Db7qxljEwKF/"
  )
})

test("normalizePostUrl: img_index違いの同一投稿は同じ正規化結果になる(重複チェックが効くように)", () => {
  const a = normalizePostUrl("https://www.instagram.com/p/Db7qxljEwKF/?locale=ja_JP&img_index=1")
  const b = normalizePostUrl("https://www.instagram.com/p/Db7qxljEwKF/?locale=ja_JP&img_index=3")
  assert.equal(a, b)
})

test("normalizePostUrl: 末尾スラッシュが無くても付与する", () => {
  assert.equal(normalizePostUrl("https://www.instagram.com/p/Db7qxljEwKF"), "https://www.instagram.com/p/Db7qxljEwKF/")
})

test("normalizePostUrl: クエリの無いURLはそのまま(末尾スラッシュのみ揃える)", () => {
  assert.equal(normalizePostUrl("https://www.instagram.com/p/Db7qxljEwKF/"), "https://www.instagram.com/p/Db7qxljEwKF/")
})

test("normalizePostUrl: instagram.com以外のURLはクエリを保持する(対象外)", () => {
  const url = "https://example.com/p/abc?foo=bar"
  assert.equal(normalizePostUrl(url), url)
})

test("normalizePostUrl: 不正なURL文字列はそのまま返す(例外を投げない)", () => {
  assert.equal(normalizePostUrl("not a url"), "not a url")
})

test("同じ店舗・同じ公開日でもInstagram投稿URLが違えば別記事として追加する", () => {
  const existing = article("first", "https://www.instagram.com/p/AAAA/")
  const next = article("second", "https://www.instagram.com/p/BBBB/")
  const data: ArticlesData = { articles: [existing], lastUpdated: existing.publishedAt }

  assert.deepEqual(addDistinctShopArticle(data, next, normalizePostUrl(next.sourceRefs[0].url)), { added: true })
  assert.deepEqual(data.articles.map((item) => item.id), ["second", "first"])
})

test("同じInstagram投稿URLはクエリ違いでも二重追加しない", () => {
  const existing = article("first", "https://www.instagram.com/p/AAAA/?img_index=1")
  const duplicate = article("second", "https://www.instagram.com/p/AAAA/?img_index=3")
  const data: ArticlesData = { articles: [existing], lastUpdated: existing.publishedAt }

  const result = addDistinctShopArticle(data, duplicate, normalizePostUrl(duplicate.sourceRefs[0].url))
  assert.equal(result.added, false)
  assert.deepEqual(data.articles.map((item) => item.id), ["first"])
})
