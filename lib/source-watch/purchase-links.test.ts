import { test } from "node:test"
import assert from "node:assert/strict"
import { buildSearchFallback, isBrandTopUrl, makeCandidate, sortPurchaseLinkCandidates } from "./purchase-links"

test("isBrandTopUrl: ドメイン直下やパス無しはブランドTOPとして扱う", () => {
  assert.equal(isBrandTopUrl("https://www.nike.com/jp"), true)
  assert.equal(isBrandTopUrl("https://www.nike.com/"), true)
})

test("isBrandTopUrl: 個別商品ページ(2階層以上)はブランドTOPではない", () => {
  assert.equal(isBrandTopUrl("https://www.nike.com/jp/t/air-jordan-1-shoes-123456"), false)
})

test("makeCandidate: ブランドTOPは購入する扱いにせず、ラベルが「公式サイトを見る」になる", () => {
  const c = makeCandidate("https://www.nike.com/jp", "official_product")
  assert.equal(c.isBrandTopOnly, true)
  assert.equal(c.kind, "brand_top")
  assert.equal(c.label, "公式サイトを見る")
})

test("makeCandidate: 個別商品ページは「購入する」ラベルになる", () => {
  const c = makeCandidate("https://www.nike.com/jp/t/air-jordan-1-shoes-123456", "official_product")
  assert.equal(c.isBrandTopOnly, false)
  assert.equal(c.label, "購入する")
})

test("sortPurchaseLinkCandidates: 優先順位(公式個別 > 正規販売店 > 抽選 > EC > 検索 > ブランドTOP)で並ぶ", () => {
  const candidates = [
    makeCandidate("https://ec.example.com/item/1", "domestic_ec"),
    makeCandidate("https://brand.example.com/", "brand_top"),
    makeCandidate("https://brand.example.com/t/product-1", "official_product"),
    makeCandidate("https://retailer.example.com/item/1", "domestic_retailer"),
  ]
  const sorted = sortPurchaseLinkCandidates(candidates)
  assert.deepEqual(
    sorted.map((c) => c.kind),
    ["official_product", "domestic_retailer", "domestic_ec", "brand_top"]
  )
})

test("buildSearchFallback: 商品名+型番が無ければ検索リンクを作らない(汎用ワード検索を防ぐ)", () => {
  assert.equal(buildSearchFallback(null, null, null), null)
})

test("buildSearchFallback: 商品名+型番があれば検索リンクを作る", () => {
  const link = buildSearchFallback("Nike", "Air Jordan 1", "CK9246-400")
  assert.ok(link)
  assert.equal(link?.kind, "search")
  // a8ejpredirectパラメータの値は「メルカリ検索URL」自体がencodeURIComponentされたもの(二重エンコード)
  const redirectTarget = new URL(link!.url).searchParams.get("a8ejpredirect")!
  assert.ok(redirectTarget.includes("jp.mercari.com/search"))
  assert.ok(new URL(redirectTarget).searchParams.get("keyword")?.includes("Nike Air Jordan 1 CK9246-400"))
})

test("PurchaseLinkCandidateはSourceLinkと別の型: publisher/sourceItemId等のSourceLink固有フィールドを持たない", () => {
  const c = makeCandidate("https://brand.example.com/t/product-1", "official_product")
  assert.ok(!("publisher" in c))
  assert.ok(!("sourceItemId" in c))
  assert.ok("kind" in c && "isBrandTopOnly" in c)
})
