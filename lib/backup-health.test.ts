import assert from "node:assert/strict"
import test from "node:test"
import { backupAgeHours } from "./backup-health"

test("バックアップ経過時間を計算する", () => {
  assert.equal(backupAgeHours({ completedAt: "2026-09-26T00:00:00.000Z" }, new Date("2026-09-26T12:00:00.000Z")), 12)
  assert.equal(backupAgeHours({}), null)
})
