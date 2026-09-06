import test from "node:test"
import assert from "node:assert/strict"
import {
  ARTICLES_PER_AUTO_PUBLISH_RUN,
  MIN_ARTICLES_PER_TWO_HOUR_SLOT,
  MAX_YOUTUBE_ARTICLES_PER_RUN,
  buildRequiredAffiliateLinks,
  jstSlotKey,
  isSameProductAssetFamily,
  uniqueGalleryCandidates,
} from "./daily-auto-publish"

test("各2時間枠の最低公開目標は3記事", () => {
  assert.equal(ARTICLES_PER_AUTO_PUBLISH_RUN, 3)
  assert.equal(MIN_ARTICLES_PER_TWO_HOUR_SLOT, 3)
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

test("JSTの同じ2時間帯は再試行しても1つの公開枠として扱う", () => {
  assert.equal(jstSlotKey(new Date("2026-08-28T23:00:00Z")), "2026-08-29-08-throughput-v4")
  assert.equal(jstSlotKey(new Date("2026-08-28T23:59:59Z")), "2026-08-29-08-throughput-v4")
  assert.equal(jstSlotKey(new Date("2026-08-29T01:00:00Z")), "2026-08-29-10-throughput-v4")
  assert.equal(jstSlotKey(new Date("2026-08-29T15:00:00Z")), "2026-08-30-00-throughput-v4")
})

test("追加画像はカバーと同一のサイズ違いを除外し、候補がある分だけ採用する", () => {
  assert.deepEqual(
    uniqueGalleryCandidates("https://img.example.com/products/airmax90-front-1200x800.jpg?w=1200", [
      { url: "https://img.example.com/products/airmax90-front-300x200.jpg?w=300", alt: "重複" },
      { url: "https://img.example.com/products/airmax90-side.jpg", alt: "側面" },
      { url: "https://img.example.com/products/unrelated-side.jpg", alt: "別商品" },
    ]),
    [
      { url: "https://img.example.com/products/airmax90-side.jpg", alt: "側面" },
    ]
  )
})

test("同じページ由来でも商品識別子が一致しない画像は追加しない", () => {
  assert.equal(
    isSameProductAssetFamily(
      "https://example.com/uploads/2026/08/ennoy-tokyo-black-main.jpg",
      "https://example.com/uploads/2026/08/new-era-cap-main.jpg"
    ),
    false
  )
  assert.equal(
    isSameProductAssetFamily(
      "https://example.com/uploads/2026/08/ennoy-tokyo-black-main.jpg",
      "https://example.com/uploads/2026/08/ennoy-tokyo-black-side.jpg"
    ),
    true
  )
})
