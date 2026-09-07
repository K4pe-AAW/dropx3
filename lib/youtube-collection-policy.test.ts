import test from "node:test"
import assert from "node:assert/strict"
import {
  HIGE_MILK_CHANNEL_ID,
  isDraftAllowedByYoutubeCollectionPolicy,
  isYoutubeVideoCollectable,
} from "./youtube-collection-policy"
import type { Draft } from "./types"

test("髭ミルクのモーニンググッド、ラジオ、雑談LIVEは収集しない", () => {
  assert.equal(isYoutubeVideoCollectable("髭ミルク", "【ラジオ】髭ミルク・嫁ヘルツのモーニンググッド！【第37回】"), false)
  assert.equal(isYoutubeVideoCollectable("髭ミルク", "欲しいスニーカーが買えなかった悲しい夜の雑談LIVE"), false)
})

test("髭ミルクの商品紹介動画は収集する", () => {
  assert.equal(isYoutubeVideoCollectable("髭ミルク", "【スニーカー】KITH NEW BALANCE 2011を開封！"), true)
  assert.equal(isYoutubeVideoCollectable("変更後の名前", "Levi's 501 XX 1942が復刻！", "", HIGE_MILK_CHANNEL_ID), true)
  assert.equal(isYoutubeVideoCollectable("髭ミルク", "Fragment × Dr.Martensが買えたので革靴デビュー"), true)
})

test("商品紹介と判定できない髭ミルク動画は安全側で収集しない", () => {
  assert.equal(isYoutubeVideoCollectable("髭ミルク", "最近のことについてお話しします"), false)
})

test("他のYouTubeチャンネルには髭ミルク専用フィルターを適用しない", () => {
  assert.equal(isYoutubeVideoCollectable("別チャンネル", "朝のラジオと雑談LIVE"), true)
})

function youtubeDraft(id: string, title: string): Draft {
  return {
    id,
    status: "pending",
    title,
    excerpt: "動画の内容を紹介します。",
    bodyParagraphs: ["動画の要点です。"],
    category: "youtube",
    brands: [],
    tags: [],
    suggestedAffiliateSearch: [],
    sourceRefs: [{ name: "髭ミルク", url: `https://www.youtube.com/watch?v=${id}` }],
    createdAt: "2026-09-07T00:00:00.000Z",
    suggestedYoutubeVideoId: id,
  }
}

test("収集済み下書きもラジオは自動公開せず、商品紹介だけを許可する", () => {
  assert.equal(isDraftAllowedByYoutubeCollectionPolicy(youtubeDraft("radio000001", "髭ミルク・嫁ヘルツが贈るラジオの魅力")), false)
  assert.equal(isDraftAllowedByYoutubeCollectionPolicy(youtubeDraft("product0001", "KITH NEW BALANCEを開封・レビュー")), true)
})
