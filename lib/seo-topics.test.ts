import assert from "node:assert/strict"
import test from "node:test"
import { matchesSeoTopic, withSeoTopicTags } from "./seo-topics"

const base = {
  title: "大人の着こなしに合うクラシックジャケット",
  excerpt: "長く使える定番を紹介。",
  bodyParagraphs: ["上品なスタイルへ取り入れやすい一着。"],
  category: "jacket" as const,
  tags: ["ジャケット"],
}

test("関連する記事だけ40代おしゃれを補う", () => {
  assert.equal(matchesSeoTopic(base, "40s-style"), true)
  assert.deepEqual(withSeoTopicTags(base), ["ジャケット", "ファッション", "40代おしゃれ"])
})

test("仕事と休日に使える記事だけ30代おしゃれを補う", () => {
  const item = {
    ...base,
    title: "仕事にも休日にも使えるきれいめジャケット",
    excerpt: "オンオフ兼用の上質な普段着を紹介。",
    bodyParagraphs: ["30代の着こなしに取り入れやすい一着。"],
  }
  assert.equal(matchesSeoTopic(item, "30s-style"), true)
  assert.deepEqual(withSeoTopicTags(item), ["ジャケット", "ファッション", "30代おしゃれ"])
})

test("一般的な大人向け記事を根拠なく30代へ分類しない", () => {
  assert.equal(matchesSeoTopic(base, "30s-style"), false)
})

test("無関係なスニーカー速報へ40代タグを付けない", () => {
  const item = { ...base, title: "新作スニーカー発売", excerpt: "限定カラー。", bodyParagraphs: ["9月発売。"], category: "sneaker" as const }
  assert.equal(matchesSeoTopic(item, "40s-style"), false)
  assert.deepEqual(withSeoTopicTags(item), ["ジャケット", "ファッション"])
})

test("女性向け単独記事をメンズへ分類しない", () => {
  const item = { ...base, title: "ウィメンズ向け新作", excerpt: "メンズモデルを再構成。" }
  assert.equal(matchesSeoTopic(item, "mens-fashion"), false)
})
