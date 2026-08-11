import { test } from "node:test"
import assert from "node:assert/strict"
import { recomputeReadiness } from "./product-recompute"
import type { ImageAsset, Product } from "./types"

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
    colorways: [{ colorName: "Black", styleCode: "AB1234-001", price: "16500円", size: null, releaseDate: "2026-09-01", retailers: [], imageAssetIds: [] }],
    sourceItemIds: [],
    sourceLinkIds: ["l1"],
    imageAssetIds: [],
    purchaseLinkCandidates: [],
    reviewStatus: "pending",
    readiness: "REVIEW",
    readinessScore: 70,
    readinessBreakdown: { relatedArticles: 0 },
    blockReasons: ["画像Rights不明"],
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

test("recomputeReadiness: 使用可能な画像を渡すとsafeImageが加点されHOLDブロック理由が消える", () => {
  const product = makeProduct()
  const result = recomputeReadiness(product, [makeImage({ rightsStatus: "approved" })])
  assert.ok(result.breakdown.safeImage > 0)
  assert.ok(!result.blockReasons.includes("画像Rights不明"))
})

test("recomputeReadiness: review_requiredの画像しかなければ引き続き画像Rights不明でHOLD", () => {
  const product = makeProduct()
  const result = recomputeReadiness(product, [makeImage({ rightsStatus: "review_required" })])
  assert.equal(result.breakdown.safeImage, 0)
  assert.ok(result.blockReasons.includes("画像Rights不明"))
  assert.equal(result.readiness, "HOLD")
})

test("recomputeReadiness: 画像が0件ならhasUnresolvedImageRightsはfalse(不明ではなく単に無い)", () => {
  const product = makeProduct({ blockReasons: [] })
  const result = recomputeReadiness(product, [])
  assert.ok(!result.blockReasons.includes("画像Rights不明"))
})

test("recomputeReadiness: purchaseLinkCandidatesのoverrideでpurchaseLinkが加点される", () => {
  const product = makeProduct({ purchaseLinkCandidates: [] })
  const withoutLink = recomputeReadiness(product, [], {})
  assert.equal(withoutLink.breakdown.purchaseLink, 0)

  const withLink = recomputeReadiness(product, [], {
    purchaseLinkCandidates: [{ url: "https://shop.example.com/item/1", kind: "domestic_retailer", isBrandTopOnly: false, label: "購入する" }],
  })
  assert.ok(withLink.breakdown.purchaseLink > 0)
})

test("recomputeReadiness: domesticConfirmedのoverrideでJapan未確認扱いを上書きできる", () => {
  const product = makeProduct({ domesticConfirmed: false })
  const result = recomputeReadiness(product, [], { domesticConfirmed: true })
  assert.ok(result.breakdown.domestic > 0)
})
