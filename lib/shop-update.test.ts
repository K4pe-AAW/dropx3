import { test } from "node:test"
import assert from "node:assert/strict"
import { normalizePostUrl } from "./shop-update"

test("normalizePostUrl: img_indexやlocaleのクエリを除去する", () => {
  assert.equal(
    normalizePostUrl("https://www.instagram.com/p/Db7qxljEwKF/?locale=ja_JP&img_index=2"),
    "https://www.instagram.com/p/Db7qxljEwKF/"
  )
})

test("normalizePostUrl: img_index違いの同一投稿は同じ正規化結果になる(重複チェックが効くように)", () => {
  const a = normalizePostUrl("https://www.instagram.com/p/Db7qxljEwKF/?locale=ja_JP&img_index=1")
  const b = normalizePostUrl("https://www.instagram.com/p/Db7qxljEwKF/?locale=ja_JP&img_index=3")
  assert.equal(a, b)
})

test("normalizePostUrl: 末尾スラッシュが無くても付与する", () => {
  assert.equal(normalizePostUrl("https://www.instagram.com/p/Db7qxljEwKF"), "https://www.instagram.com/p/Db7qxljEwKF/")
})

test("normalizePostUrl: クエリの無いURLはそのまま(末尾スラッシュのみ揃える)", () => {
  assert.equal(normalizePostUrl("https://www.instagram.com/p/Db7qxljEwKF/"), "https://www.instagram.com/p/Db7qxljEwKF/")
})

test("normalizePostUrl: instagram.com以外のURLはクエリを保持する(対象外)", () => {
  const url = "https://example.com/p/abc?foo=bar"
  assert.equal(normalizePostUrl(url), url)
})

test("normalizePostUrl: 不正なURL文字列はそのまま返す(例外を投げない)", () => {
  assert.equal(normalizePostUrl("not a url"), "not a url")
})
