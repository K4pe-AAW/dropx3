import assert from "node:assert/strict"
import test from "node:test"
import { buildReleaseCalendarIcs } from "./release-calendar-ics"
import type { Article } from "./types"

const article = {
  id: "a1", slug: "sample", title: "AURALEE 新作, ジャケット", excerpt: "", bodyParagraphs: [], coverImage: "/x.jpg",
  coverImageAlt: "", galleryImages: [], category: "jacket", brands: ["AURALEE"], tags: [],
  publishedAt: "2026-10-01T00:00:00+09:00", featured: false, affiliateLinks: [], officialLinks: [], sourceRefs: [],
} as Article

test("終日イベントとして購読可能なICSを生成する", () => {
  const ics = buildReleaseCalendarIcs([{ date: "2026-10-20", article, label: "2026年10月20日" }], "https://dropx3.com", new Date("2026-10-13T00:00:00Z"))
  assert.match(ics, /DTSTART;VALUE=DATE:20261020/)
  assert.match(ics, /DTEND;VALUE=DATE:20261021/)
  assert.match(ics, /SUMMARY:AURALEE 新作\\, ジャケット/)
  assert.match(ics, /URL:https:\/\/dropx3\.com\/articles\/sample/)
})
