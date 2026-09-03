import assert from "node:assert/strict"
import test from "node:test"
import { BlobPreconditionFailedError } from "@vercel/blob"
import { isBlobPreconditionConflict } from "./storage"

test("SDKのETag競合エラーを検知する", () => {
  assert.equal(isBlobPreconditionConflict(new BlobPreconditionFailedError()), true)
})

test("サーバーバンドルでclass identityが変わってもメッセージからETag競合を検知する", () => {
  assert.equal(isBlobPreconditionConflict(new Error("Vercel Blob: Precondition failed: ETag mismatch.")), true)
})

test("無関係な保存エラーは競合として再試行しない", () => {
  assert.equal(isBlobPreconditionConflict(new Error("permission denied")), false)
})
