import test from "node:test"
import assert from "node:assert/strict"
import { articleAnswerFacts } from "./article-answer-summary"
import type { Article } from "./types"

const base: Article = {
  id: "1", slug: "sample", title: "adidas新作 2026年秋冬", excerpt: "新作コレクション。",
  bodyParagraphs: ["具体的な型番や価格、発売日についての詳細はまだ発表されていません。"],
  coverImage: "/x.jpg", coverImageAlt: "x", galleryImages: [], category: "brand",
  brands: ["adidas"], tags: [], publishedAt: "2026-10-01T00:00:00Z", featured: false,
  affiliateLinks: [], officialLinks: [], sourceRefs: [],
}

test("季節と未発表の発売日・価格だけを要点化する", () => {
  assert.deepEqual(articleAnswerFacts(base), [
    { label: "発売時期", value: "2026年秋冬" },
    { label: "具体的な発売日", value: "未発表" },
    { label: "価格", value: "未発表" },
  ])
})

test("構造化済みの商品情報を本文推測より優先する", () => {
  const facts = articleAnswerFacts({
    ...base,
    colorways: [{ colorName: "Black", releaseDate: "2026年10月26日", price: "22,000円", styleCode: "AB-123" }],
  })
  assert.deepEqual(facts, [
    { label: "発売日", value: "2026年10月26日" },
    { label: "価格", value: "22,000円" },
    { label: "型番", value: "AB-123" },
  ])
})
