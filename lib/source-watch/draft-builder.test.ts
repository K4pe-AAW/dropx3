import { test } from "node:test"
import assert from "node:assert/strict"
import { buildSuggestedPurchaseChannels } from "./draft-builder"
import type { Product, SourceLink } from "./types"

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

function makeLink(overrides: Partial<SourceLink> = {}): SourceLink {
  return {
    id: "l1",
    publisher: "mita sneakers",
    url: "https://www.mita-sneakers.co.jp/products/x",
    type: "retailer",
    sourceScore: 90,
    checkedAt: new Date().toISOString(),
    ...overrides,
  }
}

test("buildSuggestedPurchaseChannels: 店舗が無ければ空配列", () => {
  const product = makeProduct({ colorways: [] })
  assert.deepEqual(buildSuggestedPurchaseChannels(product, []), [])
})

test("buildSuggestedPurchaseChannels: 確認済みSourceLinkの発行元と一致する店舗はofficial扱い", () => {
  const product = makeProduct({
    colorways: [{ colorName: null, styleCode: null, price: null, size: null, releaseDate: null, retailers: ["mita sneakers"], imageAssetIds: [] }],
  })
  const [channel] = buildSuggestedPurchaseChannels(product, [makeLink({ publisher: "mita sneakers" })])
  assert.equal(channel.channelType, "official")
})

test("buildSuggestedPurchaseChannels: SourceLinkに無い店舗名はsecondary扱い", () => {
  const product = makeProduct({
    colorways: [{ colorName: null, styleCode: null, price: null, size: null, releaseDate: null, retailers: ["謎のセレクトショップ"], imageAssetIds: [] }],
  })
  const [channel] = buildSuggestedPurchaseChannels(product, [makeLink({ publisher: "mita sneakers" })])
  assert.equal(channel.channelType, "secondary")
})

test("buildSuggestedPurchaseChannels: lotteryInfoが無ければsaleMethodはunknown(抽選と断定しない)", () => {
  const product = makeProduct({
    lotteryInfo: null,
    colorways: [{ colorName: null, styleCode: null, price: null, size: null, releaseDate: null, retailers: ["mita sneakers"], imageAssetIds: [] }],
  })
  const [channel] = buildSuggestedPurchaseChannels(product, [])
  assert.equal(channel.saleMethod, "unknown")
})

test("buildSuggestedPurchaseChannels: lotteryInfoがあればsaleMethod=lotteryかつdateにその文言を使う", () => {
  const product = makeProduct({
    lotteryInfo: "9月1日〜9月7日 応募",
    colorways: [{ colorName: null, styleCode: null, price: null, size: null, releaseDate: null, retailers: ["mita sneakers"], imageAssetIds: [] }],
  })
  const [channel] = buildSuggestedPurchaseChannels(product, [])
  assert.equal(channel.saleMethod, "lottery")
  assert.equal(channel.date, "9月1日〜9月7日 応募")
})
