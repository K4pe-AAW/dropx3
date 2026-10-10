import test from "node:test"
import assert from "node:assert/strict"
import { extractOfficialBrandProductLinks, interleaveOfficialBrandItems } from "./collector"
import { OFFICIAL_BRAND_LISTING_SOURCES } from "./sources"
import type { OfficialBrandListingSource } from "./sources"
import type { RawItem } from "./types"

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

test("extractOfficialBrandProductLinks: 遅延画像タグが文字列化されてもaltの商品名を使う", () => {
  const html = `<a href="/products/item-a">&lt;img src="item.jpg" alt="Velvet Wide Trousers - Black"&gt;</a>`
  assert.deepEqual(extractOfficialBrandProductLinks(html, { ...markaware, maxItems: 1 }), [
    { url: "https://markaware.jp/products/item-a", title: "Velvet Wide Trousers - Black" },
  ])
})

test("公式重点ブランドは指定11ブランドをすべて収集対象に含む", () => {
  const brands = new Set(OFFICIAL_BRAND_LISTING_SOURCES.map((source) => source.brand))
  for (const brand of [
    "A.PRESSE",
    "NICENESS",
    "LEMAIRE",
    "AURALEE",
    "COMOLI",
    "Graphpaper",
    "ssstein",
    "YOKE",
    "sacai",
    "MASU",
    "MARKAWARE",
  ]) {
    assert.equal(brands.has(brand), true, `${brand}が公式収集対象に必要`)
  }
})

test("公式ブランド商品をブランド横断で交互に並べる", () => {
  const item = (id: string): RawItem => ({
    id,
    sourceName: id.split("-")[0],
    sourceUrl: `https://example.com/${id}`,
    title: id,
    publishedAt: "2026-10-10T00:00:00.000Z",
    fetchedAt: "2026-10-10T00:00:00.000Z",
  })
  assert.deepEqual(
    interleaveOfficialBrandItems([
      [item("a-1"), item("a-2"), item("a-3")],
      [item("b-1"), item("b-2")],
      [item("c-1")],
    ]).map((entry) => entry.id),
    ["a-1", "b-1", "c-1", "a-2", "b-2", "a-3"]
  )
})
