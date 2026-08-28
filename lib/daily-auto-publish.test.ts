import test from "node:test"
import assert from "node:assert/strict"
import { jstSlotKey } from "./daily-auto-publish"

test("JSTの8時・12時・18時・20時だけ公開枠になる", () => {
  assert.equal(jstSlotKey(new Date("2026-08-28T23:00:00Z")), "2026-08-29-08")
  assert.equal(jstSlotKey(new Date("2026-08-29T03:00:00Z")), "2026-08-29-12")
  assert.equal(jstSlotKey(new Date("2026-08-29T09:00:00Z")), "2026-08-29-18")
  assert.equal(jstSlotKey(new Date("2026-08-29T11:00:00Z")), "2026-08-29-20")
  assert.equal(jstSlotKey(new Date("2026-08-29T04:00:00Z")), null)
})
