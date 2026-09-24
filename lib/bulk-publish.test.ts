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

test("楽天の商品詳細ページがある噂記事はGoss!pを外してREPORTにする", () => {
  const article = draftToBulkArticleShape({
    ...youtubeDraft,
    id: "rakuten-confirmed",
    title: "Goss!p｜確認できたスニーカー",
    informationStatus: "rumor",
    sourceRefs: [
      { name: "楽天市場", url: "https://item.rakuten.co.jp/shop-name/item-123/" },
    ],
  })
  assert.equal(article.title, "確認できたスニーカー")
  assert.equal(article.informationStatus, "report")
})

test("楽天検索リンクだけではGoss!pを外さない", () => {
  const article = draftToBulkArticleShape({
    ...youtubeDraft,
    id: "rakuten-search-only",
    title: "Goss!p｜未確認スニーカー",
    informationStatus: "rumor",
    sourceRefs: [
      { name: "楽天市場", url: "https://search.rakuten.co.jp/search/mall/item-123/" },
    ],
  })
  assert.equal(article.title, "Goss!p｜未確認スニーカー")
  assert.equal(article.informationStatus, "rumor")
})
