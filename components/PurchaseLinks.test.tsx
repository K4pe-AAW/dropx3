import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { buildMercariSearchLink } from "@/lib/affiliate"
import { PurchaseLinks } from "./PurchaseLinks"

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

  assert.match(html, /「PUMA T7 TRACK JACKET」の販売先・中古相場を探す/)
  assert.match(html, /「PUMA T7 TRACK JACKET」で検索/)
  assert.match(html, /rel="sponsored nofollow noopener noreferrer"/)
})

test("PurchaseLinks: 検索語が無い提携リンクは従来見出しへ戻す", () => {
  const html = renderToStaticMarkup(
    <PurchaseLinks
      officialLinks={[]}
      affiliateLinks={[{ label: "商品を見る", retailer: "A8.net", url: "https://example.com/products/123" }]}
      articleId="article-2"
      articleTitle="記事タイトル"
    />
  )

  assert.match(html, /販売店舗・オンラインリンク（随時更新）/)
})
