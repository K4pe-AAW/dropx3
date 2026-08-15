import { test } from "node:test"
import assert from "node:assert/strict"
import { extractYoutubeVideoId } from "./ai-draft"

test("extractYoutubeVideoId: YouTubeチャンネルRSSのwatch URLからvideoIdを取り出す", () => {
  assert.equal(extractYoutubeVideoId("https://www.youtube.com/watch?v=5YLKl50OjQc"), "5YLKl50OjQc")
})

test("extractYoutubeVideoId: 他のクエリパラメータが混ざっていても取り出せる", () => {
  assert.equal(extractYoutubeVideoId("https://www.youtube.com/watch?v=abc123&list=PLxyz"), "abc123")
})

test("extractYoutubeVideoId: YouTube以外のURLはundefined", () => {
  assert.equal(extractYoutubeVideoId("https://www.fashionsnap.com/article/2026-08-14/x/"), undefined)
})

test("extractYoutubeVideoId: YouTubeでもwatch以外のパス(チャンネルトップ等)はundefined", () => {
  assert.equal(extractYoutubeVideoId("https://www.youtube.com/@Shunsuke_Ishikawa"), undefined)
})

test("extractYoutubeVideoId: 不正なURLはundefined", () => {
  assert.equal(extractYoutubeVideoId("not a url"), undefined)
})
