import assert from "node:assert/strict"
import test from "node:test"
import { readBlobJsonFromOrigin } from "./blob-json"

test("Blob originの本文と同じ応答のETagを組にして返す", async () => {
  const calls: unknown[][] = []
  const payload = { articles: [{ id: "latest" }] }
  const stream = new Response(JSON.stringify(payload)).body!

  const result = await readBlobJsonFromOrigin<typeof payload>("data/articles.json", async (...args) => {
    calls.push(args)
    return { statusCode: 200, stream, blob: { etag: "latest-etag" } }
  })

  assert.deepEqual(calls, [["data/articles.json", { access: "public", useCache: false }]])
  assert.deepEqual(result, { data: payload, etag: "latest-etag" })
})

test("Blobが存在しない場合はnullを返す", async () => {
  const result = await readBlobJsonFromOrigin("data/missing.json", async () => null)
  assert.equal(result, null)
})
