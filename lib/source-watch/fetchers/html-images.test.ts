import test from "node:test"
import assert from "node:assert/strict"
import * as cheerio from "cheerio"
import {
  extractEmbeddedSameProductImagesFromHtml,
  extractImageCandidatesFromHtml,
  extractShopifyProductImages,
  extractVerifiedProductImagesFromHtml,
} from "./html"

test("同じ画像のサイズ違いURLを1件にまとめ、商品識別子のない汎用detail画像は除外する", () => {
  const $ = cheerio.load(`
    <meta property="og:image" content="https://cdn.example.com/products/shoe-1200x800.jpg?w=1200&q=90">
    <article>
      <img src="https://cdn.example.com/products/shoe-300x200.jpg?w=300&q=60">
      <img src="https://cdn.example.com/products/detail.jpg">
    </article>
  `)
  assert.deepEqual(extractImageCandidatesFromHtml($, "https://example.com/news/1"), [
    "https://cdn.example.com/products/shoe-1200x800.jpg?w=1200&q=90",
  ])
})

test("遅延読込属性とsrcsetから高解像度のカバーを収集し、識別子不一致画像と小さいアイコンは除外する", () => {
  const $ = cheerio.load(`
    <main>
      <img src="placeholder.gif" data-original="/images/product-main.jpg">
      <picture><source srcset="/images/look-400.jpg 400w, /images/look-1600.jpg 1600w"></picture>
      <img src="/images/badge.png" width="32" height="32">
    </main>
  `)
  assert.deepEqual(extractImageCandidatesFromHtml($, "https://example.com/item/1"), [
    "https://example.com/images/product-main.jpg",
  ])
})

test("SNSアイコン・ロゴ・関連記事領域を候補へ入れない", () => {
  const $ = cheerio.load(`
    <meta property="og:image" content="https://cdn.example.com/2026/shoe/shoe-main.jpg">
    <main>
      <img src="https://cdn.example.com/2026/shoe/shoe-side.jpg" alt="shoe side">
      <div class="social-share"><img src="https://cdn.example.com/2026/shoe/shoe-facebook.jpg" width="600" height="600"></div>
      <div class="related-posts"><img src="https://cdn.example.com/2026/shoe/shoe-otherbrand.jpg" width="1200" height="800"></div>
      <img src="https://cdn.example.com/assets/brand-logo.png" width="800" height="400">
    </main>
  `)
  assert.deepEqual(extractImageCandidatesFromHtml($, "https://example.com/item/1"), [
    "https://cdn.example.com/2026/shoe/shoe-main.jpg",
    "https://cdn.example.com/2026/shoe/shoe-side.jpg",
  ])
})

test("Product構造化データで明示された画像はファイル名がハッシュでも同一商品として収集する", () => {
  const $ = cheerio.load(`
    <meta property="og:image" content="https://cdn.example.com/products/abc123.jpg">
    <script type="application/ld+json">{
      "@context":"https://schema.org", "@type":"Product",
      "image":["https://cdn.example.com/products/abc123.jpg", "https://cdn.example.com/products/def456.jpg"]
    }</script>
  `)
  assert.deepEqual(extractImageCandidatesFromHtml($, "https://example.com/item/1"), [
    "https://cdn.example.com/products/abc123.jpg",
    "https://cdn.example.com/products/def456.jpg",
  ])
  assert.deepEqual(extractVerifiedProductImagesFromHtml($, "https://example.com/item/1"), [
    "https://cdn.example.com/products/abc123.jpg",
    "https://cdn.example.com/products/def456.jpg",
  ])
})

test("埋め込みデータは商品slugと画像名が一致する画像だけを収集する", () => {
  const $ = cheerio.load(`
    <script>self.__next_f.push([1,"https://cache.example/image?url=https%3A%2F%2Fcdn.example%2Fthin_cotton_ls_t-shirt_e1.jpg"])</script>
    <script>self.__next_f.push([1,"https://cache.example/image?url=https%3A%2F%2Fcdn.example%2Funrelated_jacket1.jpg"])</script>
  `)
  assert.deepEqual(
    extractEmbeddedSameProductImagesFromHtml($, "https://brand.example/mailorder/thin_cotton_ls_t-shirt_e"),
    ["https://cache.example/image?url=https%3A%2F%2Fcdn.example%2Fthin_cotton_ls_t-shirt_e1.jpg"]
  )
})

test("Shopify商品JSONは当該商品の画像だけを最大数まで収集する", () => {
  const images = Array.from({ length: 16 }, (_, index) => `//cdn.shopify.com/files/view-${index + 1}.jpg`)
  assert.deepEqual(
    extractShopifyProductImages({ id: 123, title: "商品", images }, "https://brand.example/products/item"),
    images.slice(0, 13).map((url) => `https:${url}`)
  )
})

test("商品IDまたは画像配列を持たないJSONは商品画像として信用しない", () => {
  assert.deepEqual(
    extractShopifyProductImages({ images: ["https://cdn.example.com/recommend/other.jpg"] }, "https://brand.example/products/item"),
    []
  )
})
