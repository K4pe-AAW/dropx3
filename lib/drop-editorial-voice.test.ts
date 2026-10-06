import assert from "node:assert/strict"
import test from "node:test"
import { DROP_EDITORIAL_VOICE, editorialStylingPerspective, editorialVerdict } from "./drop-editorial-voice"
import type { Article } from "./types"

function article(patch: Partial<Article> = {}): Article {
  return {
    id: "voice-1",
    slug: "voice-1",
    title: "メンズ新作ジャケット",
    excerpt: "2026年10月に発売される新作です。",
    bodyParagraphs: ["公式から新作が発表されました。"],
    coverImage: "/cover.jpg",
    coverImageAlt: "新作",
    galleryImages: [],
    category: "jacket",
    brands: ["TEST"],
    tags: [],
    publishedAt: "2026-10-01T00:00:00.000Z",
    featured: false,
    affiliateLinks: [],
    officialLinks: [],
    sourceRefs: [],
    ...patch,
  }
}

test("編集判断は価格不足を続報待ちにする", () => {
  assert.equal(editorialVerdict(article()).label, "続報待ち")
})

test("価格と具体情報が揃った商品だけを買う候補にする", () => {
  const result = editorialVerdict(article({
    affiliateLinks: [{ label: "販売店", retailer: "公式", url: "https://example.com", price: "¥33,000" }],
    officialLinks: [{ label: "公式", url: "https://example.com" }],
    colorways: [{ colorName: "Black", styleCode: "TEST-001", releaseDate: "2026年10月10日" }],
  }))
  assert.equal(result.label, "買う候補")
})

test("金土の編集視点だけ中目黒の地域文脈を自然に使う", () => {
  const sneaker = article({ category: "sneaker" })
  const friday = editorialStylingPerspective(sneaker, new Date("2026-10-02T03:00:00.000Z"))
  const monday = editorialStylingPerspective(sneaker, new Date("2026-10-05T03:00:00.000Z"))
  assert.match(friday, /中目黒/)
  assert.doesNotMatch(monday, /中目黒/)
})

test("ペルソナは体験の捏造を禁止する", () => {
  assert.ok(DROP_EDITORIAL_VOICE.forbiddenClaims.includes("購入しました"))
  assert.ok(DROP_EDITORIAL_VOICE.principles.some((item) => item.includes("体験談を作らない")))
})

