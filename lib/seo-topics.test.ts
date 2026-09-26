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

test("無関係なスニーカー速報へ40代タグを付けない", () => {
  const item = { ...base, title: "新作スニーカー発売", excerpt: "限定カラー。", bodyParagraphs: ["9月発売。"], category: "sneaker" as const }
  assert.equal(matchesSeoTopic(item, "40s-style"), false)
  assert.deepEqual(withSeoTopicTags(item), ["ジャケット", "ファッション"])
})

test("女性向け単独記事をメンズへ分類しない", () => {
  const item = { ...base, title: "ウィメンズ向け新作", excerpt: "メンズモデルを再構成。" }
  assert.equal(matchesSeoTopic(item, "mens-fashion"), false)
})
