import assert from "node:assert/strict"
import test from "node:test"
import { draftToBulkArticleShape } from "./bulk-publish"
import type { Draft } from "./types"

const youtubeDraft: Draft = {
  id: "youtube-draft-1",
  status: "pending",
  title: "動画タイトル",
  excerpt: "概要",
  bodyParagraphs: ["本文"],
  category: "youtube",
  contentType: "VIDEO",
  informationStatus: "official",
  brands: ["adidas"],
  tags: ["YouTube"],
  suggestedAffiliateSearch: [],
  sourceRefs: [{ name: "YouTube", url: "https://www.youtube.com/watch?v=abcdefghijk" }],
  createdAt: "2026-09-03T00:00:00.000Z",
  suggestedCoverImage: "https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg",
  suggestedYoutubeVideoId: "abcdefghijk",
}

test("YouTube下書きは動画情報と確度を保ったまま記事になる", () => {
  const article = draftToBulkArticleShape(youtubeDraft)
  assert.equal(article.contentType, "VIDEO")
  assert.equal(article.informationStatus, "official")
  assert.equal(article.youtubeVideoId, "abcdefghijk")
  assert.equal(article.coverImage, youtubeDraft.suggestedCoverImage)
})

test("同じ下書きの一括公開を再実行しても記事IDとslugが変わらない", () => {
  const first = draftToBulkArticleShape(youtubeDraft)
  const retry = draftToBulkArticleShape(youtubeDraft)
  assert.equal(first.id, retry.id)
  assert.equal(first.slug, retry.slug)
})
