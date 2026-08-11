import { test } from "node:test"
import assert from "node:assert/strict"
import { isWebSearchConfigured, searchWeb } from "./web-search"

test("isWebSearchConfigured: 両方の環境変数が無ければfalse", () => {
  const savedKey = process.env.GOOGLE_CSE_API_KEY
  const savedCx = process.env.GOOGLE_CSE_CX
  delete process.env.GOOGLE_CSE_API_KEY
  delete process.env.GOOGLE_CSE_CX
  try {
    assert.equal(isWebSearchConfigured(), false)
  } finally {
    if (savedKey) process.env.GOOGLE_CSE_API_KEY = savedKey
    if (savedCx) process.env.GOOGLE_CSE_CX = savedCx
  }
})

test("isWebSearchConfigured: 片方だけ設定されていてもfalse", () => {
  const savedKey = process.env.GOOGLE_CSE_API_KEY
  const savedCx = process.env.GOOGLE_CSE_CX
  process.env.GOOGLE_CSE_API_KEY = "dummy"
  delete process.env.GOOGLE_CSE_CX
  try {
    assert.equal(isWebSearchConfigured(), false)
  } finally {
    if (savedKey) process.env.GOOGLE_CSE_API_KEY = savedKey
    else delete process.env.GOOGLE_CSE_API_KEY
    if (savedCx) process.env.GOOGLE_CSE_CX = savedCx
  }
})

test("searchWeb: 未設定なら実際にfetchせず空配列を返す", async () => {
  const savedKey = process.env.GOOGLE_CSE_API_KEY
  const savedCx = process.env.GOOGLE_CSE_CX
  delete process.env.GOOGLE_CSE_API_KEY
  delete process.env.GOOGLE_CSE_CX
  try {
    const results = await searchWeb("test query")
    assert.deepEqual(results, [])
  } finally {
    if (savedKey) process.env.GOOGLE_CSE_API_KEY = savedKey
    if (savedCx) process.env.GOOGLE_CSE_CX = savedCx
  }
})
