import { test } from "node:test"
import assert from "node:assert/strict"
import { computeMissingFacets, sortCardsByPriority, toProductCard } from "./present"
import type { ImageAsset, Product, SourceLink } from "./types"

function makeProduct(overrides: Partial<Product> = {}): Product {
  const now = new Date().toISOString()
  return {
    id: "p1",
    normalizedBrand: "nike",
    normalizedModelName: "test model",
    styleCode: "AB1234-001",
    brand: "Nike",
    productName: "Test Model",
    category: "スニーカー",
    tier: "CONFIRMED",
    sourceScore: 90,
    officialConfirmed: true,
    domesticConfirmed: true,
    lotteryInfo: null,
    colorways: [],
    sourceItemIds: [],
    sourceLinkIds: [],
    imageAssetIds: [],
    purchaseLinkCandidates: [{ url: "https://shop.example.com/item/1", kind: "domestic_retailer", isBrandTopOnly: false, label: "購入する" }],
    reviewStatus: "pending",
    readiness: "READY",
    readinessScore: 90,
    readinessBreakdown: {},
    blockReasons: [],
    firstDetectedAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeImage(overrides: Partial<ImageAsset> = {}): ImageAsset {
  return {
    id: "img1",
    url: "https://brand.example.com/press/shoe.jpg",
    sourceUrl: "https://brand.example.com/press",
    sourceType: "official_press",
    rightsStatus: "review_required",
    checkedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeLink(overrides: Partial<SourceLink> = {}): SourceLink {
  return {
    id: "l1",
    publisher: "Nike Newsroom",
    url: "https://news.nike.com/x",
    type: "official_news",
    sourceScore: 100,
    checkedAt: new Date().toISOString(),
    ...overrides,
  }
}

test("toProductCard: 画像0件ならimageStatus=noneでcoverImageもnull", () => {
  const card = toProductCard(makeProduct({ imageAssetIds: [] }), [], [])
  assert.equal(card.imageStatus.level, "none")
  assert.equal(card.coverImage, null)
})

test("toProductCard: 使用可能な画像があればusable、coverImageに採用される", () => {
  const img = makeImage({ id: "img1", rightsStatus: "approved" })
  const card = toProductCard(makeProduct({ imageAssetIds: ["img1"] }), [], [img])
  assert.equal(card.imageStatus.level, "usable")
  assert.equal(card.coverImage?.id, "img1")
})

test("toProductCard: review_required + prohibitedが混在する場合はreview優先(使用可能候補が無くてもreview_requiredが残っていることを伝える)", () => {
  const images = [
    makeImage({ id: "a", rightsStatus: "prohibited" }),
    makeImage({ id: "b", rightsStatus: "review_required" }),
  ]
  const card = toProductCard(makeProduct({ imageAssetIds: ["a", "b"] }), [], images)
  assert.equal(card.imageStatus.level, "review")
})

test("toProductCard: 全てprohibitedならunusable", () => {
  const images = [makeImage({ id: "a", rightsStatus: "prohibited" })]
  const card = toProductCard(makeProduct({ imageAssetIds: ["a"] }), [], images)
  assert.equal(card.imageStatus.level, "unusable")
})

test("toProductCard: officialSourceLinkは確認済みタイプのSourceLinkから解決される", () => {
  const link = makeLink({ id: "l1", type: "official_news" })
  const card = toProductCard(makeProduct({ sourceLinkIds: ["l1"] }), [link], [])
  assert.equal(card.officialSourceLink?.id, "l1")
})

test("computeMissingFacets: 全て揃っていれば空配列", () => {
  const facets = computeMissingFacets({
    product: { officialConfirmed: true, domesticConfirmed: true },
    imageStatus: { level: "usable" },
    hasNonBrandTopPurchaseLink: true,
  })
  assert.deepEqual(facets, [])
})

test("computeMissingFacets: officialConfirmed=falseならofficialが含まれる", () => {
  const facets = computeMissingFacets({
    product: { officialConfirmed: false, domesticConfirmed: true },
    imageStatus: { level: "usable" },
    hasNonBrandTopPurchaseLink: true,
  })
  assert.ok(facets.includes("official"))
})

test("sortCardsByPriority: READY→REVIEW→HOLDの順になる", () => {
  const cards = [
    toProductCard(makeProduct({ id: "hold", readiness: "HOLD" }), [], []),
    toProductCard(makeProduct({ id: "ready", readiness: "READY" }), [], []),
    toProductCard(makeProduct({ id: "review", readiness: "REVIEW" }), [], []),
  ]
  const sorted = sortCardsByPriority(cards)
  assert.deepEqual(sorted.map((c) => c.product.id), ["ready", "review", "hold"])
})

test("sortCardsByPriority: 同じREVIEWなら不足項目が少ない方が先", () => {
  const missingOne = toProductCard(makeProduct({ id: "missing-one", readiness: "REVIEW", domesticConfirmed: false }), [], [])
  const missingTwo = toProductCard(
    makeProduct({ id: "missing-two", readiness: "REVIEW", domesticConfirmed: false, officialConfirmed: false }),
    [],
    []
  )
  const sorted = sortCardsByPriority([missingTwo, missingOne])
  assert.deepEqual(sorted.map((c) => c.product.id), ["missing-one", "missing-two"])
})

test("sortCardsByPriority: 同順位ならsourceScoreが高い方が先", () => {
  const low = toProductCard(makeProduct({ id: "low", readiness: "READY", sourceScore: 50 }), [], [])
  const high = toProductCard(makeProduct({ id: "high", readiness: "READY", sourceScore: 95 }), [], [])
  const sorted = sortCardsByPriority([low, high])
  assert.deepEqual(sorted.map((c) => c.product.id), ["high", "low"])
})
