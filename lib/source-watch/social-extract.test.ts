import { test } from "node:test"
import assert from "node:assert/strict"
import { extractSocialPostInfo } from "./social-extract"

test("extractSocialPostInfo: キャプションが空ならAPIを呼ばず全項目null/空配列を返す(捏造しない)", async () => {
  const result = await extractSocialPostInfo("", "https://www.instagram.com/p/xxxxx/")
  assert.equal(result.brand, null)
  assert.equal(result.saleMethod, null)
  assert.equal(result.entryDeadlineAt, null)
  assert.deepEqual(result.postTypes, [])
  assert.deepEqual(result.hashtags, [])
})
