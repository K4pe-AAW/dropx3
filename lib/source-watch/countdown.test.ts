import { test } from "node:test"
import assert from "node:assert/strict"
import { formatCountdown, formatRelativeTime, isThisWeek, isToday, isUrgent, parseSocialDate, pickRelevantDeadline } from "./countdown"
import type { SocialInfo } from "./types"

function emptySocial(overrides: Partial<SocialInfo> = {}): SocialInfo {
  return {
    characterName: null,
    seriesName: null,
    eventName: null,
    eventLocation: null,
    saleMethod: null,
    postTypes: [],
    entryStartAt: null,
    entryDeadlineAt: null,
    winnerAnnounceAt: null,
    saleStartAt: null,
    saleEndAt: null,
    eventStartAt: null,
    eventEndAt: null,
    shipAt: null,
    purchaseLimit: null,
    entryConditions: null,
    targetRegion: null,
    hashtags: [],
    ...overrides,
  }
}

test("parseSocialDate: 時刻明記のISO文字列はそのままパースする", () => {
  const d = parseSocialDate("2026-08-14T23:59:00+09:00", "end")
  assert.ok(d)
  assert.equal(d!.toISOString(), new Date("2026-08-14T23:59:00+09:00").toISOString())
})

test("parseSocialDate: 日付のみ(時刻不明)はkind=endなら日本時間23:59:59を補う", () => {
  const d = parseSocialDate("2026-08-14", "end")
  assert.ok(d)
  assert.equal(d!.toISOString(), new Date("2026-08-14T23:59:59+09:00").toISOString())
})

test("parseSocialDate: 日付のみ(時刻不明)はkind=startなら日本時間0:00を補う", () => {
  const d = parseSocialDate("2026-08-14", "start")
  assert.ok(d)
  assert.equal(d!.toISOString(), new Date("2026-08-14T00:00:00+09:00").toISOString())
})

test("parseSocialDate: nullや空文字はnull", () => {
  assert.equal(parseSocialDate(null, "end"), null)
  assert.equal(parseSocialDate("", "end"), null)
})

test("parseSocialDate: 不正な文字列はnull(クラッシュしない)", () => {
  assert.equal(parseSocialDate("そのうち", "end"), null)
})

test("pickRelevantDeadline: 応募締切が最優先", () => {
  const social = emptySocial({ entryDeadlineAt: "2026-08-14", saleEndAt: "2026-08-20" })
  const result = pickRelevantDeadline(social)
  assert.equal(result?.label, "応募締切")
})

test("pickRelevantDeadline: 応募締切が無ければ販売終了", () => {
  const social = emptySocial({ saleEndAt: "2026-08-20" })
  const result = pickRelevantDeadline(social)
  assert.equal(result?.label, "販売終了")
})

test("pickRelevantDeadline: 何も無ければnull", () => {
  assert.equal(pickRelevantDeadline(emptySocial()), null)
})

test("formatCountdown: 1日以上先なら「あとN日」", () => {
  const now = new Date("2026-08-11T00:00:00+09:00")
  const target = new Date("2026-08-14T00:00:00+09:00")
  assert.equal(formatCountdown(target, now), "あと3日")
})

test("formatCountdown: 24時間未満なら「あとN時間」", () => {
  const now = new Date("2026-08-11T00:00:00+09:00")
  const target = new Date("2026-08-11T18:00:00+09:00")
  assert.equal(formatCountdown(target, now), "あと18時間")
})

test("formatCountdown: 過去日時は「終了」", () => {
  const now = new Date("2026-08-11T00:00:00+09:00")
  const target = new Date("2026-08-10T00:00:00+09:00")
  assert.equal(formatCountdown(target, now), "終了")
})

test("isUrgent: 24時間以内はtrue、それ以上はfalse", () => {
  const now = new Date("2026-08-11T00:00:00+09:00")
  assert.equal(isUrgent(new Date("2026-08-11T12:00:00+09:00"), now), true)
  assert.equal(isUrgent(new Date("2026-08-13T00:00:00+09:00"), now), false)
})

test("isToday/isThisWeek", () => {
  const now = new Date("2026-08-11T10:00:00+09:00")
  assert.equal(isToday(new Date("2026-08-11T23:00:00+09:00"), now), true)
  assert.equal(isToday(new Date("2026-08-12T01:00:00+09:00"), now), false)
  assert.equal(isThisWeek(new Date("2026-08-15T00:00:00+09:00"), now), true)
  assert.equal(isThisWeek(new Date("2026-08-25T00:00:00+09:00"), now), false)
})

test("formatRelativeTime: 分/時間/日単位で表示する", () => {
  const now = new Date("2026-08-11T12:00:00+09:00")
  assert.equal(formatRelativeTime(new Date("2026-08-11T11:45:00+09:00").toISOString(), now), "15分前")
  assert.equal(formatRelativeTime(new Date("2026-08-11T09:00:00+09:00").toISOString(), now), "3時間前")
  assert.equal(formatRelativeTime(new Date("2026-08-09T12:00:00+09:00").toISOString(), now), "2日前")
})
