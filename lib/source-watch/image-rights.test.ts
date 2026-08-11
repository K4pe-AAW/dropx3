import { test } from "node:test"
import assert from "node:assert/strict"
import { detectPressAssetLinks, imageStatusOf, isEmbedOnly, isImageAutoUsable } from "./image-rights"
import type { ImageAsset } from "./types"

test("ImageAsset: Press AssetのrightsUrl(利用規約ページ)を保持できる", () => {
  const asset: ImageAsset = {
    id: "img1",
    url: "https://brand.example.com/press/hires/shoe.jpg",
    sourceUrl: "https://brand.example.com/press",
    rightsUrl: "https://brand.example.com/press/terms",
    sourceType: "official_press",
    rightsStatus: "review_required",
    checkedAt: new Date().toISOString(),
  }
  assert.equal(asset.rightsUrl, "https://brand.example.com/press/terms")
})

test("isImageAutoUsable: rightsStatusが未確認(review_required)の画像は自動使用しない", () => {
  assert.equal(isImageAutoUsable({ sourceType: "official_press", rightsStatus: "review_required" }), false)
})

test("isImageAutoUsable: prohibitedは自動使用しない", () => {
  assert.equal(isImageAutoUsable({ sourceType: "official_press", rightsStatus: "prohibited" }), false)
})

test("isImageAutoUsable: approved/permission_received/terms_confirmedのみ自動使用可能", () => {
  assert.equal(isImageAutoUsable({ sourceType: "official_press", rightsStatus: "approved" }), true)
  assert.equal(isImageAutoUsable({ sourceType: "official_press", rightsStatus: "permission_received" }), true)
  assert.equal(isImageAutoUsable({ sourceType: "official_press", rightsStatus: "terms_confirmed" }), true)
})

test("isImageAutoUsable: third_party_mediaはrightsStatusがapprovedでも自動使用しない(二重ガード)", () => {
  assert.equal(isImageAutoUsable({ sourceType: "third_party_media", rightsStatus: "approved" }), false)
})

test("isEmbedOnly: embed_onlyのみtrue", () => {
  assert.equal(isEmbedOnly({ rightsStatus: "embed_only" }), true)
  assert.equal(isEmbedOnly({ rightsStatus: "approved" }), false)
})

test("imageStatusOf: isImageAutoUsableがtrueならusable", () => {
  assert.equal(imageStatusOf({ sourceType: "official_press", rightsStatus: "approved" }), "usable")
})

test("imageStatusOf: prohibitedはunusable", () => {
  assert.equal(imageStatusOf({ sourceType: "official_press", rightsStatus: "prohibited" }), "unusable")
})

test("imageStatusOf: embed_onlyはembed_only", () => {
  assert.equal(imageStatusOf({ sourceType: "official_social", rightsStatus: "embed_only" }), "embed_only")
})

test("imageStatusOf: review_requiredはreview", () => {
  assert.equal(imageStatusOf({ sourceType: "affiliate_asset", rightsStatus: "review_required" }), "review")
})

test("imageStatusOf: third_party_mediaはapproved扱いにされていてもusableにならずreview", () => {
  assert.equal(imageStatusOf({ sourceType: "third_party_media", rightsStatus: "approved" }), "review")
})

test("detectPressAssetLinks: Press Kit/Media Kit等のリンクテキストを検出する", () => {
  const anchors = [
    { text: "Download Press Kit", href: "/press/kit" },
    { text: "About Us", href: "/about" },
    { text: "Terms of Use", href: "/terms" },
    { text: "Hi-Res Images", href: "/media/hires" },
  ]
  const { pressAssetLinks, rightsLinks } = detectPressAssetLinks(anchors)
  assert.equal(pressAssetLinks.length, 2) // Press Kit, Hi-Res Images
  assert.equal(rightsLinks.length, 1) // Terms of Use
  assert.ok(pressAssetLinks.some((l) => l.href === "/press/kit"))
  assert.ok(rightsLinks.some((l) => l.href === "/terms"))
})
