import test from "node:test"
import assert from "node:assert/strict"
import * as cheerio from "cheerio"
import { extractImageCandidatesFromHtml } from "./html"

test("同じ画像のサイズ違いURLを1件にまとめる", () => {
  const $ = cheerio.load(`
    <meta property="og:image" content="https://cdn.example.com/products/shoe-1200x800.jpg?w=1200&q=90">
    <article>
      <img src="https://cdn.example.com/products/shoe-300x200.jpg?w=300&q=60">
      <img src="https://cdn.example.com/products/detail.jpg">
    </article>
  `)
  assert.deepEqual(extractImageCandidatesFromHtml($, "https://example.com/news/1"), [
    "https://cdn.example.com/products/shoe-1200x800.jpg?w=1200&q=90",
    "https://cdn.example.com/products/detail.jpg",
  ])
})

test("遅延読込属性とsrcsetから高解像度画像を収集し、小さいアイコンは除外する", () => {
  const $ = cheerio.load(`
    <main>
      <img src="placeholder.gif" data-original="/images/product-main.jpg">
      <picture><source srcset="/images/look-400.jpg 400w, /images/look-1600.jpg 1600w"></picture>
      <img src="/images/badge.png" width="32" height="32">
    </main>
  `)
  assert.deepEqual(extractImageCandidatesFromHtml($, "https://example.com/item/1"), [
    "https://example.com/images/product-main.jpg",
    "https://example.com/images/look-1600.jpg",
  ])
})
