import assert from "node:assert/strict"
import test from "node:test"
import { reviewEditorialPost } from "./drop-editorial-review"
import type { Article } from "./types"

const source: Article = {
  id: "review-source",
  slug: "review-source",
  title: "Graphpaper メンズジャケット GP-001が発売",
  excerpt: "新作ジャケットの発売情報です。",
  bodyParagraphs: ["2026年10月10日に発売します。"],
  coverImage: "/sample.jpg",
  coverImageAlt: "sample",
  galleryImages: [],
  category: "jacket",
  informationStatus: "official",
  brands: ["Graphpaper"],
  tags: ["メンズ"],
  publishedAt: "2026-10-08T00:00:00.000Z",
  featured: false,
  colorways: [{ colorName: "Black", styleCode: "GP-001", releaseDate: "2026年10月10日", price: "¥44,000" }],
  affiliateLinks: [],
  officialLinks: [{ label: "公式", url: "https://example.com/gp-001" }],
  sourceRefs: [],
}

test("根拠・具体性・用途を満たすDROP編集投稿を承認する", () => {
  const result = reviewEditorialPost({
    id: "editorial-1",
    kind: "editorial_spotlight",
    text: "DROP判断｜実物確認\nGraphpaper メンズジャケット GP-001が発売\n\n価格と発売日は確認済み。黒スラックスに合わせるなら、丈と手持ちの靴とのバランスを実物で確認したい一着です。",
    sourceArticles: [source],
    reviewedAt: "2026-10-08T00:00:00.000Z",
  })
  assert.equal(result.verdict, "approved")
  assert.equal(result.claimChecks.length >= 2, true)
})

test("未確認の着用体験を含む編集投稿を拒否する", () => {
  const result = reviewEditorialPost({
    id: "editorial-2",
    kind: "editorial_spotlight",
    text: "Graphpaper メンズジャケット GP-001。着心地が良かったので絶対買いです。黒スラックスにも合います。",
    sourceArticles: [source],
    reviewedAt: "2026-10-08T00:00:00.000Z",
  })
  assert.equal(result.verdict, "rejected")
  assert.match(result.reasons.join(" "), /未確認|煽り/)
})

test("直近投稿とほぼ同じ文章は反復過多として拒否する", () => {
  const text = "DROP判断｜実物確認\nGraphpaper メンズジャケット GP-001が発売\n\n価格と発売日は確認済み。黒スラックスに合わせるなら、丈と手持ちの靴とのバランスを実物で確認したい一着です。"
  const result = reviewEditorialPost({
    id: "editorial-3",
    kind: "editorial_spotlight",
    text,
    sourceArticles: [source],
    reviewedAt: "2026-10-08T00:00:00.000Z",
    recentEditorialTexts: [text],
  })
  assert.equal(result.verdict, "rejected")
  assert.equal(result.scores.repetition, 5)
})
