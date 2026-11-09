import assert from "node:assert/strict"
import test from "node:test"
import {
  extractSitemapUrls,
  hasNoindex,
  isPathAllowedForGooglebot,
  selectDailyPublicUrls,
} from "./indexability-audit"

test("Googlebotは公開ページを許可し、管理/APIを除外する", () => {
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nUser-agent: GPTBot\nDisallow: /`
  assert.equal(isPathAllowedForGooglebot(robots, "/articles/example"), true)
  assert.equal(isPathAllowedForGooglebot(robots, "/admin"), false)
  assert.equal(isPathAllowedForGooglebot(robots, "/api/private"), false)
})

test("sitemap URLを抽出してXML entityを戻す", () => {
  assert.deepEqual(extractSitemapUrls("<urlset><url><loc>https://dropx3.com/a?x=1&amp;y=2</loc></url></urlset>"), [
    "https://dropx3.com/a?x=1&y=2",
  ])
})

test("固定ページ・最新記事・日替わり記事を重複なく選ぶ", () => {
  const urls = [
    "https://dropx3.com/",
    "https://dropx3.com/brand/Example",
    ...Array.from({ length: 20 }, (_, index) => `https://dropx3.com/articles/${index}`),
  ]
  const selected = selectDailyPublicUrls(urls, "2026-11-09", { latestArticles: 2, rotatingArticles: 3 })
  assert.equal(selected.length, 6)
  assert.deepEqual(selected.slice(0, 3), [
    "https://dropx3.com/",
    "https://dropx3.com/articles/0",
    "https://dropx3.com/articles/1",
  ])
  assert.equal(new Set(selected).size, selected.length)
})

test("HTTPヘッダーとmeta robotsのnoindexを検出する", () => {
  assert.equal(hasNoindex("<html></html>", "noindex, nofollow"), true)
  assert.equal(hasNoindex('<meta name="robots" content="max-image-preview:large, noindex">', null), true)
  assert.equal(hasNoindex('<meta name="robots" content="index, follow">', null), false)
})
