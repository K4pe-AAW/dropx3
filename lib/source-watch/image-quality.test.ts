import { test } from "node:test"
import assert from "node:assert/strict"
import { bestImageGrade, gradeImageAsset } from "./image-quality"
import type { ImageAsset } from "./types"

function makeAsset(overrides: Partial<ImageAsset> = {}): ImageAsset {
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

test("gradeImageAsset: 使用不可(prohibited)はnull(評価対象外)", () => {
  assert.equal(gradeImageAsset(makeAsset({ rightsStatus: "prohibited" })), null)
})

test("gradeImageAsset: third_party_mediaはapprovedでもisImageAutoUsableがfalseのためunusable扱いでnull", () => {
  assert.equal(gradeImageAsset(makeAsset({ sourceType: "third_party_media", rightsStatus: "prohibited" })), null)
})

test("gradeImageAsset: review_required(未確認)はまだ確定できないためnull", () => {
  assert.equal(gradeImageAsset(makeAsset({ sourceType: "official_press", rightsStatus: "review_required" })), null)
})

test("gradeImageAsset: Official Press + approved + 解像度不明 => A", () => {
  assert.equal(gradeImageAsset(makeAsset({ sourceType: "official_press", rightsStatus: "approved" })), "A")
})

test("gradeImageAsset: Official Press + approved + 低解像度判明 => B(降格)", () => {
  assert.equal(gradeImageAsset(makeAsset({ sourceType: "official_press", rightsStatus: "approved", width: 400, height: 300 })), "B")
})

test("gradeImageAsset: Affiliate + approved => B", () => {
  assert.equal(gradeImageAsset(makeAsset({ sourceType: "affiliate_asset", rightsStatus: "approved" })), "B")
})

test("gradeImageAsset: 公式SNS埋め込み(embed_only) => C", () => {
  assert.equal(gradeImageAsset(makeAsset({ sourceType: "official_social", rightsStatus: "embed_only" })), "C")
})

test("gradeImageAsset: editorial_placeholder => D", () => {
  assert.equal(gradeImageAsset(makeAsset({ sourceType: "editorial_placeholder", rightsStatus: "approved" })), "D")
})

test("bestImageGrade: 複数候補の中から最良のグレードを返す(A優先)", () => {
  const assets = [
    makeAsset({ id: "a", sourceType: "affiliate_asset", rightsStatus: "approved" }), // B
    makeAsset({ id: "b", sourceType: "official_press", rightsStatus: "approved" }), // A
  ]
  assert.equal(bestImageGrade(assets), "A")
})

test("bestImageGrade: 評価可能な候補が無ければnull", () => {
  const assets = [makeAsset({ rightsStatus: "review_required" })]
  assert.equal(bestImageGrade(assets), null)
})
