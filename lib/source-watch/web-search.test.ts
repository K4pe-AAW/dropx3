import { test } from "node:test"
import assert from "node:assert/strict"
import { isWebSearchConfigured, searchWeb } from "./web-search"

// 自動検索は恒久的に無効（Custom Search JSON API が新規利用者に提供されないため）。
// 環境変数を足しても有効にならないことを、ここで固定する。

test("isWebSearchConfigured: 常にfalse", () => {
  assert.equal(isWebSearchConfigured(), false)
})

test("isWebSearchConfigured: 環境変数を設定しても有効にならない", () => {
  const savedKey = process.env.GOOGLE_CSE_API_KEY
  const savedCx = process.env.GOOGLE_CSE_CX
  process.env.GOOGLE_CSE_API_KEY = "dummy"
  process.env.GOOGLE_CSE_CX = "dummy"
  try {
    assert.equal(isWebSearchConfigured(), false)
  } finally {
    if (savedKey) process.env.GOOGLE_CSE_API_KEY = savedKey
    else delete process.env.GOOGLE_CSE_API_KEY
    if (savedCx) process.env.GOOGLE_CSE_CX = savedCx
    else delete process.env.GOOGLE_CSE_CX
  }
})

test("searchWeb: 外部へfetchせず空配列を返す", async () => {
  const results = await searchWeb("test query")
  assert.deepEqual(results, [])
})
