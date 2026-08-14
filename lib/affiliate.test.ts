import { test } from "node:test"
import assert from "node:assert/strict"
import { buildMercariSearchLink, buildYahooShoppingSearchLink } from "./affiliate"

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
