import assert from "node:assert/strict"
import test from "node:test"
import { detectUnconfirmedStatus, ensureUnconfirmedTitle, isInformationStatus, isUnconfirmedStatus, unconfirmedNotice } from "./information-status"

test("情報ステータスは許可値だけを受け付ける", () => {
  assert.equal(isInformationStatus("leak"), true)
  assert.equal(isInformationStatus("rumor"), true)
  assert.equal(isInformationStatus("confirmed"), false)
})

test("元情報にリーク・噂の明示があればAI分類より優先できる", () => {
  assert.equal(detectUnconfirmedStatus("New model leaked ahead of launch"), "leak")
  assert.equal(detectUnconfirmedStatus("発売の噂が浮上"), "rumor")
  assert.equal(detectUnconfirmedStatus("ブランドが正式発表"), undefined)
})

test("未確認記事のタイトルに表示が無ければ自動で補う", () => {
  assert.equal(ensureUnconfirmedTitle("新型モデルが登場", "leak"), "リーク｜新型モデルが登場")
  assert.equal(ensureUnconfirmedTitle("新型モデルが登場か", "leak"), "新型モデルが登場か")
})

test("噂とリークだけを未確認情報として扱う", () => {
  assert.equal(isUnconfirmedStatus("leak"), true)
  assert.equal(isUnconfirmedStatus("report"), false)
  assert.match(unconfirmedNotice("leak"), /情報解禁を待ちましょう/)
})
