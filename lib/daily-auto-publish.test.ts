import test from "node:test"
import assert from "node:assert/strict"
import {
  ARTICLES_PER_AUTO_PUBLISH_RUN,
  MAX_YOUTUBE_ARTICLES_PER_RUN,
  buildRequiredAffiliateLinks,
  jstSlotKey,
  uniqueGalleryCandidates,
} from "./daily-auto-publish"

test("各時刻の公開目標は4記事", () => {
  assert.equal(ARTICLES_PER_AUTO_PUBLISH_RUN, 4)
})

test("各公開枠のYouTube記事は最大1件", () => {
  assert.equal(MAX_YOUTUBE_ARTICLES_PER_RUN, 1)
})

test("自動公開はZOZOTOWNを要求せず5店舗のリンクを生成する", () => {
  const previous = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG
  process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG = "dropx3-test-22"
  try {
    assert.deepEqual(buildRequiredAffiliateLinks("Nike Air Max 90").map((link) => link.retailer), [
      "楽天市場",
      "メルカリ",
      "SNKRDUNK",
      "Amazon",
      "Yahoo!ショッピング",
    ])
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG
    else process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG = previous
  }
})

test("JSTの8時・12時・18時・20時だけ公開枠になる", () => {
  assert.equal(jstSlotKey(new Date("2026-08-28T23:00:00Z")), "2026-08-29-08")
  assert.equal(jstSlotKey(new Date("2026-08-29T03:00:00Z")), "2026-08-29-12")
  assert.equal(jstSlotKey(new Date("2026-08-29T09:00:00Z")), "2026-08-29-18")
  assert.equal(jstSlotKey(new Date("2026-08-29T11:00:00Z")), "2026-08-29-20")
  assert.equal(jstSlotKey(new Date("2026-08-29T04:00:00Z")), null)
})

test("追加画像はカバーと同一のサイズ違いを除外し、候補がある分だけ採用する", () => {
  assert.deepEqual(
    uniqueGalleryCandidates("https://img.example.com/shoe-1200x800.jpg?w=1200", [
      { url: "https://img.example.com/shoe-300x200.jpg?w=300", alt: "重複" },
      { url: "https://img.example.com/side.jpg", alt: "側面" },
      { url: "https://img.example.com/back.jpg", alt: "背面" },
    ]),
    [
      { url: "https://img.example.com/side.jpg", alt: "側面" },
      { url: "https://img.example.com/back.jpg", alt: "背面" },
    ]
  )
})
