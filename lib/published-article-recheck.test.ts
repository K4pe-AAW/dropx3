import assert from "node:assert/strict"
import test from "node:test"
import { buildRecheckResult, recheckSourceUrl } from "./published-article-recheck"
import type { Article } from "./types"

const article: Article = {
  id: "a", slug: "a", title: "Goss!p｜新作スニーカー", excerpt: "旧要約", bodyParagraphs: ["旧本文"],
  coverImage: "/a.jpg", coverImageAlt: "靴", galleryImages: [], category: "sneaker", informationStatus: "rumor",
  brands: ["BRAND"], tags: [], publishedAt: "2026-09-20T00:00:00.000Z", featured: false,
  affiliateLinks: [], officialLinks: [{ label: "公式商品", url: "https://brand.example/products/shoe" }], sourceRefs: [],
}

test("確認済み公式商品ページがある記事を再確認候補にする", () => {
  assert.equal(recheckSourceUrl(article), "https://brand.example/products/shoe")
  assert.equal(recheckSourceUrl({ ...article, officialLinks: [{ label: "検索", url: "https://www.google.com/search?q=shoe" }] }), null)
})

test("正規販売店の商品ページも再確認候補にし、二次流通は根拠にしない", () => {
  const withoutOfficialLink = { ...article, officialLinks: [] }
  assert.equal(recheckSourceUrl({
    ...withoutOfficialLink,
    purchaseChannels: [{
      retailerName: "正規販売店",
      channelType: "official",
      saleMethod: "regular",
      url: "https://retailer.example/items/shoe",
    }],
  }), "https://retailer.example/items/shoe")
  assert.equal(recheckSourceUrl({
    ...withoutOfficialLink,
    purchaseChannels: [{
      retailerName: "二次流通",
      channelType: "secondary",
      saleMethod: "regular",
      url: "https://secondary.example/items/shoe",
    }],
  }), null)
})

test("公式商品ページで再確認できた噂記事はREPORTへ上げ、画像はpatchへ含めない", () => {
  const result = buildRecheckResult(article, {
    title: "新作スニーカー",
    excerpt: "新要約",
    bodyParagraphs: ["新本文"],
    colorways: [{ colorName: "Black", price: "20,000円" }],
    sourceRef: { name: "brand.example", url: "https://brand.example/products/shoe" },
    imageCandidates: ["https://brand.example/new.jpg"],
    commerceLinkCandidates: [],
  }, "https://brand.example/products/shoe", "2026-09-25T00:00:00.000Z")
  assert.equal(result.upgraded, true)
  assert.equal(result.patch.informationStatus, "report")
  assert.equal(result.patch.title, "新作スニーカー")
  assert.equal("galleryImages" in result.patch, false)
  assert.equal("coverImage" in result.patch, false)
})

test("リーク記事は販売ページを確認してもLEAKを維持する", () => {
  const leak = { ...article, informationStatus: "leak" as const, title: "リーク｜新作" }
  const result = buildRecheckResult(leak, {
    title: leak.title, excerpt: leak.excerpt, bodyParagraphs: leak.bodyParagraphs, colorways: [],
    sourceRef: { name: "brand.example", url: "https://brand.example/products/shoe" }, imageCandidates: [], commerceLinkCandidates: [],
  }, "https://brand.example/products/shoe", "2026-09-25T00:00:00.000Z")
  assert.equal(result.patch.informationStatus, "leak")
  assert.equal(result.upgraded, false)
})
