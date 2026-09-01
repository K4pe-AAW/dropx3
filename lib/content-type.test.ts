import assert from "node:assert/strict"
import test from "node:test"
import { CONTENT_TYPE_LABELS, inferContentType, isContentType, isEditorialContentType } from "./content-type"

test("記事タイプをカテゴリーと販売導線から推定する", () => {
  assert.equal(inferContentType("youtube"), "VIDEO")
  assert.equal(inferContentType("sneaker", true), "BUY")
  assert.equal(inferContentType("news"), "NEWS")
  assert.equal(inferContentType("apparel"), "GUIDE")
})

test("記事タイプの許可値だけを受け入れる", () => {
  assert.equal(isContentType("BUY"), true)
  assert.equal(isContentType("COLUMN"), true)
  assert.equal(isContentType("PICKS"), true)
  assert.equal(isContentType("SNAP"), true)
  assert.equal(isContentType("OTHER"), false)
})

test("編集記事タイプを表示用ラベルとともに判定する", () => {
  assert.equal(isEditorialContentType("COLUMN"), true)
  assert.equal(isEditorialContentType("PICKS"), true)
  assert.equal(isEditorialContentType("SNAP"), true)
  assert.equal(isEditorialContentType("NEWS"), false)
  assert.equal(CONTENT_TYPE_LABELS.COLUMN, "編集部コラム")
  assert.equal(CONTENT_TYPE_LABELS.PICKS, "EDITOR’S PICKS")
  assert.equal(CONTENT_TYPE_LABELS.SNAP, "編集部スナップ")
})
