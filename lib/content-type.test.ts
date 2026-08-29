import assert from "node:assert/strict"
import test from "node:test"
import { inferContentType, isContentType } from "./content-type"

test("記事タイプをカテゴリーと販売導線から推定する", () => {
  assert.equal(inferContentType("youtube"), "VIDEO")
  assert.equal(inferContentType("sneaker", true), "BUY")
  assert.equal(inferContentType("news"), "NEWS")
  assert.equal(inferContentType("apparel"), "GUIDE")
})

test("記事タイプの許可値だけを受け入れる", () => {
  assert.equal(isContentType("BUY"), true)
  assert.equal(isContentType("OTHER"), false)
})
