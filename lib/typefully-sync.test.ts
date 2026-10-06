import assert from "node:assert/strict"
import test from "node:test"
import { draftTitle, sameDayArticleKey, TYPEFULLY_QUEUE_TARGET } from "./typefully-sync"
import type { SocialPostDraft } from "./social-promotion"

const candidate: SocialPostDraft = {
  id: "article-1:new_article:2026-09-29",
  articleId: "article-1",
  kind: "new_article",
  text: "NEW｜記事",
  url: "https://dropx3.com/articles/article-1",
  imageUrl: "https://dropx3.com/image.jpg",
  reason: "test",
  generatedAt: "2026-09-29T00:00:00.000Z",
  freshnessAt: "2026-09-29T00:00:00.000Z",
}

test("Typefully draft title preserves the dated candidate id", () => {
  assert.equal(draftTitle(candidate), "DROP article-1:new_article:2026-09-29")
})

test("same-day dedupe ignores post kind but allows another day", () => {
  assert.equal(sameDayArticleKey(candidate.id), "article-1:2026-09-29")
  assert.equal(sameDayArticleKey("article-1:release_day:2026-09-29"), "article-1:2026-09-29")
  assert.notEqual(
    sameDayArticleKey("article-1:new_article:2026-09-29"),
    sameDayArticleKey("article-1:new_article:2026-09-30")
  )
})

test("編集投稿も同じJST日では重複させない", () => {
  assert.equal(
    sameDayArticleKey("editorial-daily-drop:editorial_daily_drop:2026-09-29"),
    "editorial-daily-drop:2026-09-29"
  )
})

test("Typefullyは最大16件の予約を維持する", () => {
  assert.equal(TYPEFULLY_QUEUE_TARGET, 16)
})
