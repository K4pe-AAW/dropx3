import { test } from "node:test"
import assert from "node:assert/strict"
import { extractYoutubeVideoId, sanitizeSuggestedPurchaseChannels } from "./ai-draft"

test("extractYoutubeVideoId: YouTubeチャンネルRSSのwatch URLからvideoIdを取り出す", () => {
  assert.equal(extractYoutubeVideoId("https://www.youtube.com/watch?v=5YLKl50OjQc"), "5YLKl50OjQc")
})

test("extractYoutubeVideoId: 他のクエリパラメータが混ざっていても取り出せる", () => {
  assert.equal(extractYoutubeVideoId("https://www.youtube.com/watch?v=abc123&list=PLxyz"), "abc123")
})

test("extractYoutubeVideoId: YouTube以外のURLはundefined", () => {
  assert.equal(extractYoutubeVideoId("https://www.fashionsnap.com/article/2026-08-14/x/"), undefined)
})

test("extractYoutubeVideoId: YouTubeでもwatch/shorts以外のパス(チャンネルトップ等)はundefined", () => {
  assert.equal(extractYoutubeVideoId("https://www.youtube.com/@Shunsuke_Ishikawa"), undefined)
})

test("extractYoutubeVideoId: ショート動画(/shorts/…)からも取り出せる", () => {
  assert.equal(extractYoutubeVideoId("https://www.youtube.com/shorts/2m1iniI60Zk"), "2m1iniI60Zk")
})

test("extractYoutubeVideoId: 不正なURLはundefined", () => {
  assert.equal(extractYoutubeVideoId("not a url"), undefined)
})

test("販売リンクは元ページから収集した許可URLだけ保持する", () => {
  const allowed = "https://shop.example.jp/raffle/1"
  const channels = sanitizeSuggestedPurchaseChannels(
    [
      { retailerName: "正規店", channelType: "official", saleMethod: "lottery", url: allowed },
      { retailerName: "創作URL", channelType: "official", saleMethod: "regular", url: "https://fake.example/buy" },
    ],
    new Set([allowed])
  )
  assert.equal(channels[0].url, allowed)
  assert.equal(channels[1].url, undefined)
})
