import assert from "node:assert/strict"
import test from "node:test"
import { draftTitle, isTypefullyCandidateApproved, sameDayArticleKey, selectTypefullyCandidates, TYPEFULLY_QUEUE_TARGET } from "./typefully-sync"
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

test("Typefullyは1日最大5件に絞る", () => {
  assert.equal(TYPEFULLY_QUEUE_TARGET, 5)
})

test("Typefully公開候補は重要速報2件と編集3件を交互に選ぶ", () => {
  const approvedReview = {
    version: 1 as const,
    verdict: "approved" as const,
    reviewedAt: "2026-10-09T00:00:00.000Z",
    fingerprint: "test",
    scores: { audienceFit: 4, grounding: 5, specificity: 4, naturalness: 4, usefulness: 4, repetition: 2 },
    reasons: ["合格"],
    claimChecks: [{ claim: "事実", evidence: "公開済み記事" }],
    sourceArticleIds: ["article-1"],
    limitations: "未試着",
  }
  const editorial = (kind: SocialPostDraft["kind"]): SocialPostDraft => ({
    ...candidate,
    id: `${kind}:${kind}:2026-09-29`,
    kind,
    editorialReview: approvedReview,
  })
  const news2 = { ...candidate, id: "article-2:release_day:2026-09-29", articleId: "article-2" }
  const selected = selectTypefullyCandidates([
    editorial("editorial_daily_drop"),
    candidate,
    news2,
    editorial("editorial_spotlight"),
    editorial("editorial_compare"),
    editorial("editorial_tomorrow"),
  ])
  assert.deepEqual(selected.map((item) => item.kind), [
    "editorial_daily_drop",
    "new_article",
    "editorial_spotlight",
    "new_article",
    "editorial_compare",
  ])
})

test("Goss!p・リークはTypefully自動公開候補にしない", () => {
  assert.equal(isTypefullyCandidateApproved({ ...candidate, text: "Goss!p・未確認｜NEW" }), false)
  assert.equal(isTypefullyCandidateApproved({ ...candidate, text: "リーク・未確認｜本日発売" }), false)
})

test("Typefullyは品質承認のない編集投稿を予約しない", () => {
  const editorial = { ...candidate, kind: "editorial_spotlight" as const }
  assert.equal(isTypefullyCandidateApproved(editorial), false)
  assert.equal(isTypefullyCandidateApproved({
    ...editorial,
    editorialReview: {
      version: 1,
      verdict: "approved",
      reviewedAt: "2026-10-09T00:00:00.000Z",
      fingerprint: "test",
      scores: { audienceFit: 4, grounding: 5, specificity: 4, naturalness: 4, usefulness: 4, repetition: 2 },
      reasons: ["合格"],
      claimChecks: [{ claim: "事実", evidence: "公開済み記事" }],
      sourceArticleIds: ["article-1"],
      limitations: "未試着",
    },
  }), true)
})
