import test from "node:test"
import assert from "node:assert/strict"
import { extractOfficialBrandProductLinks } from "./collector"
import type { OfficialBrandListingSource } from "./sources"

const markaware: OfficialBrandListingSource = {
  name: "MARKAWARE公式",
  brand: "MARKAWARE",
  listingUrl: "https://markaware.jp/",
  productPathMarker: "/products/",
  maxItems: 2,
}

test("extractOfficialBrandProductLinks: 商品だけを重複なく取得しShopifyのcollection URLを正規化する", () => {
  const html = `
    <a href="/collections/new-in/products/item-a">Item A</a>
    <a href="/collections/new-in/products/item-a">Item A duplicate</a>
    <a href="/pages/about">About us</a>
    <a href="https://other.example/products/item-x">External</a>
    <a href="/products/item-b">Item B</a>
    <a href="/products/item-c">Item C</a>
  `
  assert.deepEqual(extractOfficialBrandProductLinks(html, markaware), [
    { url: "https://markaware.jp/products/item-a", title: "Item A" },
    { url: "https://markaware.jp/products/item-b", title: "Item B" },
  ])
})

test("extractOfficialBrandProductLinks: 文字のない商品リンクはslugをタイトルへ使う", () => {
  const html = `<a href="/products/organic-wool-jacket"><img alt=""></a>`
  assert.deepEqual(extractOfficialBrandProductLinks(html, { ...markaware, maxItems: 1 }), [
    { url: "https://markaware.jp/products/organic-wool-jacket", title: "organic wool jacket" },
  ])
})
