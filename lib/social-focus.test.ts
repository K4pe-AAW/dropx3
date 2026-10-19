import assert from "node:assert/strict"
import test from "node:test"
import { isStreetBrandContent, socialFocusLane } from "./social-focus"

test("重点ドメブラをdomesticへ分類する", () => {
  assert.equal(socialFocusLane({ brands: ["A.PRESSE"] }), "domestic")
})

test("代表的なストリートブランドをstreetへ分類する", () => {
  assert.equal(socialFocusLane({ brands: ["Supreme"] }), "street")
  assert.equal(socialFocusLane({ brands: ["Nike"] }), "street")
})

test("ブランド表記がなくても明確なストリート／スニーカー記事を拾う", () => {
  assert.equal(isStreetBrandContent({ title: "新作スニーカーを発売" }), true)
})

test("一般ファッション記事は重点レーンへ入れない", () => {
  assert.equal(socialFocusLane({ title: "春のファッションニュース" }), "other")
})
