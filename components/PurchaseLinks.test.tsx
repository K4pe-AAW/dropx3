import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { buildMercariSearchLink } from "@/lib/affiliate"
import { isDirectOfficialSiteUrl, officialSiteSearchUrl, PurchaseLinks } from "./PurchaseLinks"

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

  assert.match(html, /「PUMA T7 TRACK JACKET」の販売情報・購入先/)
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

  assert.match(html, /販売情報・購入先/)
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

test("PurchaseLinks: 確認済み公式URLがあれば検索を挟まず直接つなぐ", () => {
  const html = renderToStaticMarkup(
    <PurchaseLinks
      officialLinks={[{ label: "PUMA公式", url: "https://jp.puma.com/example" }]}
      affiliateLinks={[buildMercariSearchLink("PUMA T7 TRACK JACKET")]}
      articleId="article-4"
      articleTitle="PUMA T7 TRACK JACKET"
      brand="PUMA"
    />
  )

  assert.match(html, /href="https:\/\/jp\.puma\.com\/example"[^>]*>[\s\S]*公式サイトで探す/)
  assert.doesNotMatch(html, /google\.com\/search\?q=/)
  assert.ok(html.indexOf("公式サイトで探す") < html.indexOf("メルカリ"))
})

test("PurchaseLinks: YouTubeやSNSだけなら公式サイト検索へフォールバックする", () => {
  const html = renderToStaticMarkup(
    <PurchaseLinks
      officialLinks={[{ label: "動画を見る", url: "https://www.youtube.com/watch?v=abc123" }]}
      affiliateLinks={[]}
      articleId="article-5"
      articleTitle="ブランドの新作紹介"
      brand="TEST BRAND"
    />
  )

  assert.match(html, /google\.com\/search\?q=/)
  assert.match(html, /動画を見る/)
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

test("isDirectOfficialSiteUrl: ブランドサイトだけを直接リンク候補にする", () => {
  assert.equal(isDirectOfficialSiteUrl("https://jp.puma.com/example"), true)
  assert.equal(isDirectOfficialSiteUrl("https://www.youtube.com/watch?v=abc123"), false)
  assert.equal(isDirectOfficialSiteUrl("https://www.instagram.com/example/"), false)
  assert.equal(isDirectOfficialSiteUrl("https://www.google.com/search?q=PUMA"), false)
})

test("PurchaseLinks: 販売方法と公式リンクを同じブロックへ統合し重複表示しない", () => {
  const atmosUrl = "https://www.atmos-tokyo.com/item/salomon/l49236600"
  const html = renderToStaticMarkup(
    <PurchaseLinks
      officialLinks={[
        { label: "サロモン公式商品ページ", url: "https://www.salomon.com/products/xt-whisper-void" },
        { label: "atmos公式商品ページ", url: atmosUrl },
      ]}
      purchaseChannels={[
        {
          retailerName: "atmos",
          channelType: "official",
          saleMethod: "regular",
          date: "2026年9月16日",
          url: atmosUrl,
        },
      ]}
      affiliateLinks={[buildMercariSearchLink("サロモン XT-WHISPER VOID")]}
      articleId="article-6"
      articleTitle="サロモン XT-WHISPER VOID"
      brand="サロモン"
    />
  )

  assert.match(html, /販売情報・購入先/)
  assert.match(html, /公式・正規販売店/)
  assert.match(html, /atmos公式商品ページ/)
  assert.match(html, /通常販売/)
  assert.match(html, /2026年9月16日/)
  assert.equal((html.match(/atmos公式商品ページ/g) ?? []).length, 1)
  assert.doesNotMatch(html, /抽選情報・販売方法/)
})
