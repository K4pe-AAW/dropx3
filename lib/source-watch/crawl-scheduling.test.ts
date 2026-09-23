import test from "node:test"
import assert from "node:assert/strict"
import { selectDueSources } from "./crawl"
import type { CrawlLog, Source } from "./types"

const source = (id: string, interval = 60): Source => ({
  id,
  name: id,
  category: "official",
  sourceScore: 100,
  monitoringMethod: "html",
  monitoringIntervalMinutes: interval,
  enabled: true,
  imagePolicy: "unknown",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
})

const log = (sourceId: string, startedAt: string): CrawlLog => ({
  id: `${sourceId}-${startedAt}`,
  sourceId,
  startedAt,
  finishedAt: startedAt,
  newCount: 0,
  changedCount: 0,
  errorCount: 0,
  errors: [],
  robotsVerdict: "allowed",
  method: "html",
  durationMs: 1,
})

test("selectDueSources: 未巡回を先にし、その後は最終巡回が古い順に選ぶ", () => {
  const now = Date.parse("2026-09-23T12:00:00.000Z")
  const selected = selectDueSources([
    { source: source("recent"), latestLog: log("recent", "2026-09-23T10:00:00.000Z") },
    { source: source("never") },
    { source: source("oldest"), latestLog: log("oldest", "2026-09-20T10:00:00.000Z") },
  ], now, 2)
  assert.deepEqual(selected.map((item) => item.id), ["never", "oldest"])
})

test("selectDueSources: 巡回間隔に達していないソースは選ばない", () => {
  const now = Date.parse("2026-09-23T12:00:00.000Z")
  const selected = selectDueSources([
    { source: source("not-due", 240), latestLog: log("not-due", "2026-09-23T10:00:00.000Z") },
    { source: source("due", 60), latestLog: log("due", "2026-09-23T10:00:00.000Z") },
  ], now, 2)
  assert.deepEqual(selected.map((item) => item.id), ["due"])
})
