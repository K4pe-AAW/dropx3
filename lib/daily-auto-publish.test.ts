import test from "node:test"
import assert from "node:assert/strict"
import { ARTICLES_PER_AUTO_PUBLISH_RUN, buildRequiredAffiliateLinks, jstSlotKey } from "./daily-auto-publish"

test("各時刻の公開目標は4記事", () => {
  assert.equal(ARTICLES_PER_AUTO_PUBLISH_RUN, 4)
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
