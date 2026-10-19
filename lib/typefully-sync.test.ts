import assert from "node:assert/strict"
import test from "node:test"
import { draftTitle, isTypefullyCandidateApproved, jstMinuteKey, sameDayArticleKey, selectTypefullyCandidates, TYPEFULLY_DAILY_SLOTS, TYPEFULLY_QUEUE_TARGET } from "./typefully-sync"
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
  focusLane: "street",
}

test("Typefully draft title preserves the dated candidate id", () => {
  assert.equal(draftTitle(candidate), "DROP article-1:new_article:2026-09-29")
  assert.equal(
    draftTitle({ ...candidate, text: "Goss!p・未確認｜新着です。" }),
    "DROP article-1:new_article:2026-09-29 [GOSSIP]"
  )
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

test("Typefullyは1日最大10件を10時から20時までに配信する", () => {
  assert.equal(TYPEFULLY_QUEUE_TARGET, 10)
  assert.deepEqual(TYPEFULLY_DAILY_SLOTS, [
    { h: 10, m: 0 },
    { h: 11, m: 0 },
    { h: 12, m: 0 },
    { h: 13, m: 0 },
    { h: 14, m: 0 },
    { h: 15, m: 0 },
    { h: 16, m: 0 },
    { h: 17, m: 0 },
    { h: 18, m: 0 },
    { h: 20, m: 0 },
  ])
})

test("Typefullyの予約時刻は表記差があってもJST分単位で同じ枠とみなす", () => {
  assert.equal(jstMinuteKey("2026-10-16T22:30:00.000Z"), "2026-10-17 07:30")
  assert.equal(jstMinuteKey("2026-10-17T07:30:45+09:00"), "2026-10-17 07:30")
})

test("Typefully公開候補はドメブラ・ストリートの新着だけを最大10件選ぶ", () => {
  const focused = Array.from({ length: 12 }, (_, index): SocialPostDraft => ({
    ...candidate,
    id: `article-${index}:new_article:2026-09-29`,
    articleId: `article-${index}`,
    focusLane: index % 2 === 0 ? "domestic" : "street",
  }))
  const selected = selectTypefullyCandidates([
    { ...candidate, id: "other:new_article:2026-09-29", focusLane: "other" },
    ...focused,
  ])
  assert.equal(selected.length, 10)
  assert.ok(selected.every((item) => item.focusLane === "domestic" || item.focusLane === "street"))
})

test("Goss!pは1日1件まで許可し、リークはTypefully自動公開候補にしない", () => {
  const gossipA = { ...candidate, id: "gossip-a:new_article:2026-09-29", text: "Goss!p・未確認｜新着です。" }
  const gossipB = { ...candidate, id: "gossip-b:new_article:2026-09-29", text: "Goss!p・未確認｜続報です。" }
  assert.equal(isTypefullyCandidateApproved(gossipA), true)
  assert.equal(isTypefullyCandidateApproved({ ...candidate, text: "リーク・未確認｜本日発売" }), false)
  assert.equal(selectTypefullyCandidates([gossipA, gossipB]).filter((item) => item.text.startsWith("Goss!p")).length, 1)
  assert.equal(selectTypefullyCandidates([gossipA], 0).length, 0)
})

test("編集企画は品質承認の有無にかかわらず予約しない", () => {
  const legacyEditorial = { ...candidate, kind: "editorial_spotlight" } as unknown as SocialPostDraft
  assert.equal(isTypefullyCandidateApproved(legacyEditorial), false)
})
