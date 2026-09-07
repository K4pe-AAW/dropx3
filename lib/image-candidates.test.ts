import test from "node:test"
import assert from "node:assert/strict"
import {
  MAX_ARTICLE_GALLERY_IMAGES,
  MAX_ARTICLE_IMAGE_CANDIDATES,
  isImageNoiseUrl,
  selectProductImageCandidates,
} from "./image-candidates"

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

test("安全な同一商品画像はカバー1枚と追加最大12枚まで採用する", () => {
  const sameProduct = Array.from(
    { length: MAX_ARTICLE_IMAGE_CANDIDATES + 3 },
    (_, index) => `https://cdn.example.com/products/airmax90-view-${index + 1}.jpg`
  )
  const selected = selectProductImageCandidates([
    sameProduct[0],
    "https://cdn.example.com/products/unrelated-view-1.jpg",
    ...sameProduct.slice(1),
  ])

  assert.equal(MAX_ARTICLE_GALLERY_IMAGES, 12)
  assert.equal(selected.length, MAX_ARTICLE_IMAGE_CANDIDATES)
  assert.equal(selected[0], sameProduct[0])
  assert.equal(selected.includes("https://cdn.example.com/products/unrelated-view-1.jpg"), false)
})
