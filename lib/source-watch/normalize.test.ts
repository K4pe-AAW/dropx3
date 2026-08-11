import { test } from "node:test"
import assert from "node:assert/strict"
import { normalizeUrl, normalizeStyleCode, normalizeModelName, buildProductMatchKey } from "./normalize"

test("normalizeUrl: 同じURLをトラッキングパラメータ有無で同一視できる(同じSourceItemを重複登録しないための土台)", () => {
  const a = normalizeUrl("https://example.com/news/foo?utm_source=twitter&utm_medium=social")
  const b = normalizeUrl("https://example.com/news/foo")
  assert.equal(a, b)
})

test("normalizeUrl: 末尾スラッシュの有無を同一視する", () => {
  assert.equal(normalizeUrl("https://example.com/news/foo/"), normalizeUrl("https://example.com/news/foo"))
})

test("normalizeStyleCode: 大文字化し空白を除去するが、ハイフンは保持する", () => {
  assert.equal(normalizeStyleCode(" ck9246-400 "), "CK9246-400")
})

test("normalizeModelName: 表記揺れ(ハイフン/スペース/大文字小文字)を同一視する", () => {
  assert.equal(normalizeModelName("Air Max 90"), normalizeModelName("air-max-90"))
})

test("buildProductMatchKey: 型番があれば型番を最優先する(ブランド/モデル名が無くても型番だけでキーになる)", () => {
  const key = buildProductMatchKey({ styleCode: "CK9246-400", brand: null, modelName: null })
  assert.equal(key.styleCode, "CK9246-400")
})

test("buildProductMatchKey: 型番が無い場合はブランド+モデル名で判定する", () => {
  const key = buildProductMatchKey({ styleCode: null, brand: "Nike", modelName: "Air Max 90" })
  assert.equal(key.styleCode, null)
  assert.equal(key.normalizedBrand, "nike")
  assert.ok(key.normalizedModelName)
})

test("buildProductMatchKey: 何も無ければ全てnull(新規Productとして扱われ誤結合しない)", () => {
  const key = buildProductMatchKey({ styleCode: null, brand: null, modelName: null })
  assert.equal(key.styleCode, null)
  assert.equal(key.normalizedBrand, null)
  assert.equal(key.normalizedModelName, null)
})
