import { test } from "node:test"
import assert from "node:assert/strict"
import {
  buildMercariSearchLink,
  buildYahooShoppingSearchLink,
  buildSnkrdunkSearchLink,
  buildRakutenSearchLink,
} from "./affiliate"

test("buildMercariSearchLink: 具体的なキーワードから検索URLを組み立てる", () => {
  const link = buildMercariSearchLink("Nike Air Max 90 IM9616-001")
  assert.equal(link.retailer, "メルカリ")
  assert.match(link.url, /a8mat=/)
  assert.match(link.url, /keyword%3DNike%2520Air%2520Max%252090/)
})

test("buildMercariSearchLink: カテゴリ名のみは拒否する", () => {
  assert.throws(() => buildMercariSearchLink("スニーカー"))
})

test("buildMercariSearchLink: 空文字は拒否する", () => {
  assert.throws(() => buildMercariSearchLink("  "))
})

test("buildYahooShoppingSearchLink: 具体的なキーワードから検索URLを組み立てる", () => {
  const link = buildYahooShoppingSearchLink("HOKA Bondi 7")
  assert.equal(link.retailer, "Yahoo!ショッピング")
  assert.match(link.url, /sid=3778012&pid=892676774/)
  assert.match(link.url, /p%3DHOKA%2520Bondi%25207/)
})

test("buildYahooShoppingSearchLink: カテゴリ名のみは拒否する", () => {
  assert.throws(() => buildYahooShoppingSearchLink("靴"))
})

// A8.netの「商品リンク作成」→「テキスト生成」で実際に発行したリンク(query="Nike Air Max 90")と
// 完全一致することを確認する(トラッキングコード・エンコード段数を含めて再現できているかの検証)
test("buildSnkrdunkSearchLink: 実際にA8.netで発行したリンクと完全一致する", () => {
  const link = buildSnkrdunkSearchLink("Nike Air Max 90")
  assert.equal(link.retailer, "SNKRDUNK")
  assert.equal(
    link.url,
    "https://px.a8.net/svt/ejp?a8mat=4BA1PB+28DJG2+4LZK+HUKPU&a8ejpredirect=https%3A%2F%2Fsnkrdunk.com%2Fsearch%3Fkeywords%3DNike%2520Air%2520Max%252090"
  )
})

test("buildSnkrdunkSearchLink: カテゴリ名のみは拒否する", () => {
  assert.throws(() => buildSnkrdunkSearchLink("スニーカー"))
})

test("buildRakutenSearchLink: 実際にA8.netで発行したリンクと完全一致する", () => {
  const link = buildRakutenSearchLink("Nike Air Max 90")
  assert.equal(link.retailer, "楽天市場")
  assert.equal(
    link.url,
    "https://rpx.a8.net/svt/ejp?a8mat=4BA1PA+CFPZOY+2HOM+BW8O1&rakuten=y&a8ejpredirect=http%3A%2F%2Fhb.afl.rakuten.co.jp%2Fhgc%2F0ea62065.34400275.0ea62066.204f04c0%2Fa26080942703_4BA1PA_CFPZOY_2HOM_BW8O1%3Fpc%3Dhttps%253A%252F%252Fsearch.rakuten.co.jp%252Fsearch%252Fmall%252FNike%252520Air%252520Max%25252090%252F%26m%3Dhttps%253A%252F%252Fsearch.rakuten.co.jp%252Fsearch%252Fmall%252FNike%252520Air%252520Max%25252090%252F"
  )
})

test("buildRakutenSearchLink: カテゴリ名のみは拒否する", () => {
  assert.throws(() => buildRakutenSearchLink("靴"))
})
