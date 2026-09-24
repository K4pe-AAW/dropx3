import assert from "node:assert/strict"
import test from "node:test"
import {
  applyRakutenProductEvidence,
  detectUnconfirmedStatus,
  ensureUnconfirmedTitle,
  isDirectRakutenProductUrl,
  isInformationStatus,
  isUnconfirmedStatus,
  removeGosspTitlePrefix,
  unconfirmedNotice,
} from "./information-status"

test("情報ステータスは許可値だけを受け付ける", () => {
  assert.equal(isInformationStatus("leak"), true)
  assert.equal(isInformationStatus("rumor"), true)
  assert.equal(isInformationStatus("confirmed"), false)
})

test("元情報にリーク・Goss!pの明示があればAI分類より優先できる", () => {
  assert.equal(detectUnconfirmedStatus("New model leaked ahead of launch"), "leak")
  assert.equal(detectUnconfirmedStatus("発売の噂が浮上"), "rumor")
  assert.equal(detectUnconfirmedStatus("Goss!p｜新作が登場か"), "rumor")
  assert.equal(detectUnconfirmedStatus("Gossp!｜旧表記の記事"), "rumor")
  assert.equal(detectUnconfirmedStatus("ブランドが正式発表"), undefined)
})

test("未確認記事のタイトルに表示が無ければ自動で補う", () => {
  assert.equal(ensureUnconfirmedTitle("新型モデルが登場", "leak"), "リーク｜新型モデルが登場")
  assert.equal(ensureUnconfirmedTitle("新型モデルが登場か", "leak"), "新型モデルが登場か")
  assert.equal(ensureUnconfirmedTitle("新型モデルが登場", "rumor"), "Goss!p｜新型モデルが登場")
})

test("Goss!pとリークだけを未確認情報として扱う", () => {
  assert.equal(isUnconfirmedStatus("leak"), true)
  assert.equal(isUnconfirmedStatus("report"), false)
  assert.match(unconfirmedNotice("leak"), /情報解禁を待ちましょう/)
})

test("楽天の商品詳細ページだけを販売実在の根拠として扱う", () => {
  assert.equal(isDirectRakutenProductUrl("https://item.rakuten.co.jp/shop-name/item-123/"), true)
  assert.equal(isDirectRakutenProductUrl("https://product.rakuten.co.jp/product/-/abc123/"), true)
  assert.equal(isDirectRakutenProductUrl("https://brandavenue.rakuten.co.jp/item/AB1234/"), true)
  assert.equal(isDirectRakutenProductUrl("https://search.rakuten.co.jp/search/mall/XT-WHISPER/"), false)
  assert.equal(isDirectRakutenProductUrl("https://www.rakuten.co.jp/shop-name/"), false)
})

test("楽天の商品詳細がある噂はREPORTへ上げ、リークは維持する", () => {
  const productUrl = "https://item.rakuten.co.jp/shop-name/item-123/"
  assert.equal(applyRakutenProductEvidence("rumor", [productUrl]), "report")
  assert.equal(applyRakutenProductEvidence("leak", [productUrl]), "leak")
  assert.equal(
    applyRakutenProductEvidence("rumor", ["https://search.rakuten.co.jp/search/mall/item-123/"]),
    "rumor"
  )
  assert.equal(removeGosspTitlePrefix("Goss!p｜新作スニーカーが登場"), "新作スニーカーが登場")
})
