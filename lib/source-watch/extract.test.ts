import { test } from "node:test"
import assert from "node:assert/strict"
import { extractProductInfo } from "./extract"
import type { SourceItem } from "./types"

test("extractProductInfo: 本文もタイトルも無い場合はAPIを呼ばず全項目nullを返す(捏造しない)", async () => {
  const item: SourceItem = {
    id: "test",
    sourceId: "test-source",
    sourceUrl: "https://example.com/x",
    title: "",
    detectedAt: new Date().toISOString(),
    processingStatus: "new",
  }
  const result = await extractProductInfo(item)
  assert.equal(result.brand, null)
  assert.equal(result.styleCode, null)
  assert.equal(result.domesticReleaseDate, null)
  assert.equal(result.price, null)
  assert.equal(result.isReissue, null)
})
