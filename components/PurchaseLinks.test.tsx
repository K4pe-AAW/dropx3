import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { buildMercariSearchLink } from "@/lib/affiliate"
import { officialSiteSearchUrl, PurchaseLinks } from "./PurchaseLinks"

test("PurchaseLinks: 商品検索語を見出しと各販売先に明示する", () => {
  const html = renderToStaticMarkup(
    <PurchaseLinks
      officialLinks={[]}
      affiliateLinks={[buildMercariSearchLink("PUMA T7 TRACK JACKET")]}
      articleId="article-1"
      articleTitle="PUMAとJOURNAL STANDARDのコラボ"
      brand="PUMA"
      contentType="BUY"
    />
  )

  assert.match(html, /「PUMA T7 TRACK JACKET」の公式サイト・販売先を探す/)
  assert.match(html, /公式サイトで探す/)
  assert.match(html, /「PUMA T7 TRACK JACKET」で検索/)
  assert.match(html, /rel="sponsored nofollow noopener noreferrer"/)
  assert.ok(html.indexOf("公式サイトで探す") < html.indexOf("メルカリ"))
})

test("PurchaseLinks: 検索語が無い提携リンクは汎用見出しへ戻す", () => {
  const html = renderToStaticMarkup(
    <PurchaseLinks
      officialLinks={[]}
      affiliateLinks={[{ label: "商品を見る", retailer: "A8.net", url: "https://example.com/products/123" }]}
      articleId="article-2"
      articleTitle="記事タイトル"
    />
  )

  assert.match(html, /公式サイト・販売先を探す/)
})

test("PurchaseLinks: 公式リンクも広告リンクも無い記事に公式サイト検索を表示する", () => {
  const html = renderToStaticMarkup(
    <PurchaseLinks
      officialLinks={[]}
      affiliateLinks={[]}
      articleId="article-3"
      articleTitle="新作ジャケットを発表"
      brand="TEST BRAND"
    />
  )

  assert.match(html, /公式サイトで探す/)
  assert.match(html, /google\.com\/search\?q=/)
  assert.doesNotMatch(html, />PR</)
})

test("officialSiteSearchUrl: ブランド・商品名・公式を検索語にする", () => {
  const url = new URL(officialSiteSearchUrl("記事タイトル", "PUMA", "T7 TRACK JACKET"))
  assert.equal(url.hostname, "www.google.com")
  assert.equal(url.searchParams.get("q"), "PUMA T7 TRACK JACKET 公式")
})

test("officialSiteSearchUrl: 商品名にブランドが含まれる場合は重複させない", () => {
  const url = new URL(officialSiteSearchUrl("記事タイトル", "PUMA", "PUMA T7 TRACK JACKET"))
  assert.equal(url.searchParams.get("q"), "PUMA T7 TRACK JACKET 公式")
})
