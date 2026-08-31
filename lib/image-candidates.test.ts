import test from "node:test"
import assert from "node:assert/strict"
import { isImageNoiseUrl, selectProductImageCandidates } from "./image-candidates"

test("SNS・ロゴ・おすすめ画像URLを強制除外する", () => {
  assert.equal(isImageNoiseUrl("https://cdn.example.com/assets/facebook-icon.png"), true)
  assert.equal(isImageNoiseUrl("https://cdn.example.com/assets/brand-logo.svg"), true)
  assert.equal(isImageNoiseUrl("https://cdn.example.com/recommend/other-brand.jpg"), true)
  assert.equal(isImageNoiseUrl("https://cdn.example.com/products/airmax90-main.jpg"), false)
})

test("カバー優先で同一商品識別子を持つ画像だけ残す", () => {
  assert.deepEqual(selectProductImageCandidates([
    "https://cdn.example.com/products/airmax90-main.jpg",
    "https://cdn.example.com/products/airmax90-side.jpg",
    "https://cdn.example.com/products/adidas-samba-side.jpg",
    "https://cdn.example.com/assets/instagram-icon.png",
  ]), [
    "https://cdn.example.com/products/airmax90-main.jpg",
    "https://cdn.example.com/products/airmax90-side.jpg",
  ])
})
