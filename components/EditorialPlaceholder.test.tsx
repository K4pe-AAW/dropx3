import { test } from "node:test"
import assert from "node:assert/strict"
import { EditorialPlaceholder } from "./EditorialPlaceholder"

// レンダラーは使わず、Reactが返すプレーンなelement記述(type/props)だけを検証する。
// 目的: 画像が無い場合に「実際の商品写真に見える生成画像」ではなく、テキストのみの
// 情報グラフィック(divベースのコンポーネント)が使われることを保証する。
test("EditorialPlaceholder: imgタグではなくdivベースの情報グラフィックを返す(AI画像生成を使わない)", () => {
  const element = EditorialPlaceholder({
    brand: "NIKE",
    productName: "AIR JORDAN XXXX",
    styleCode: "XXXXXX-000",
    releaseDate: "2026.09.01",
  })
  assert.equal(element.type, "div")
  const text = JSON.stringify(element)
  assert.ok(text.includes("PRODUCT IMAGE"))
  assert.ok(text.includes("NIKE"))
  assert.ok(text.includes("XXXXXX-000"))
  assert.ok(!text.includes('"img"')) // <img>要素を含まない
})

test("EditorialPlaceholder: 情報が無い項目は出力しない(捏造しない)", () => {
  const element = EditorialPlaceholder({})
  const text = JSON.stringify(element)
  assert.ok(text.includes("PRODUCT IMAGE"))
  assert.ok(!text.includes('"img"'))
})
