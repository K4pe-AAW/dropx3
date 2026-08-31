import { test } from "node:test"
import assert from "node:assert/strict"
import { computeSocialSummary, socialCardsOf, sortSocialCardsByPriority } from "./social-present"
import { toProductCard } from "./present"
import type { Product, SocialInfo } from "./types"

function emptySocial(overrides: Partial<SocialInfo> = {}): SocialInfo {
  return {
    characterName: null,
    seriesName: null,
    eventName: null,
    eventLocation: null,
    saleMethod: null,
    postTypes: [],
    entryStartAt: null,
    entryDeadlineAt: null,
    winnerAnnounceAt: null,
    saleStartAt: null,
    saleEndAt: null,
    eventStartAt: null,
    eventEndAt: null,
    shipAt: null,
    purchaseLimit: null,
    entryConditions: null,
    targetRegion: null,
    hashtags: [],
    ...overrides,
  }
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  const now = new Date().toISOString()
  return {
    id: "p1",
    normalizedBrand: "instinctoy",
    normalizedModelName: "test",
    styleCode: null,
    brand: "INSTINCTOY",
    productName: "Test Sofubi",
    category: null,
    tier: "CONFIRMED",
    sourceScore: 95,
    officialConfirmed: true,
    domesticConfirmed: true,
    lotteryInfo: null,
    colorways: [],
    sourceItemIds: [],
    sourceLinkIds: [],
    imageAssetIds: [],
    purchaseLinkCandidates: [],
    reviewStatus: "pending",
    readiness: "REVIEW",
    readinessScore: 60,
    readinessBreakdown: {},
    blockReasons: [],
    firstDetectedAt: now,
    updatedAt: now,
    ...overrides,
  }
}

test("socialCardsOf: product.socialが無いカードは除外する", () => {
  const withSocial = toProductCard(makeProduct({ id: "a", social: emptySocial() }), [], [])
  const withoutSocial = toProductCard(makeProduct({ id: "b" }), [], [])
  const result = socialCardsOf([withSocial, withoutSocial])
  assert.deepEqual(result.map((c) => c.product.id), ["a"])
})

test("sortSocialCardsByPriority: 締切が近い方が先", () => {
  const near = toProductCard(makeProduct({ id: "near", social: emptySocial({ entryDeadlineAt: "2099-01-02" }) }), [], [])
  const far = toProductCard(makeProduct({ id: "far", social: emptySocial({ entryDeadlineAt: "2099-06-01" }) }), [], [])
  const sorted = sortSocialCardsByPriority([far, near])
  assert.deepEqual(sorted.map((c) => c.product.id), ["near", "far"])
})

test("sortSocialCardsByPriority: 締切がある方が無い方より先", () => {
  const withDeadline = toProductCard(makeProduct({ id: "with", social: emptySocial({ entryDeadlineAt: "2099-01-02" }) }), [], [])
  const withoutDeadline = toProductCard(makeProduct({ id: "without", social: emptySocial() }), [], [])
  const sorted = sortSocialCardsByPriority([withoutDeadline, withDeadline])
  assert.deepEqual(sorted.map((c) => c.product.id), ["with", "without"])
})

test("computeSocialSummary: 抽選件数・締切件数を正しく数える", () => {
  const now = new Date("2026-08-31T03:00:00.000Z")
  const dueTodayIso = new Date("2026-08-31T04:00:00.000Z").toISOString() // 同日内の1時間後
  const lottery = toProductCard(makeProduct({ id: "lottery", social: emptySocial({ saleMethod: "web_lottery", entryDeadlineAt: dueTodayIso }) }), [], [])
  const release = toProductCard(makeProduct({ id: "release", social: emptySocial({ postTypes: ["release"] }) }), [], [])
  const summary = computeSocialSummary([lottery, release], now)
  assert.equal(summary.total, 2)
  assert.equal(summary.raffle, 1)
  assert.equal(summary.dueToday, 1)
  assert.equal(summary.release, 1)
})
