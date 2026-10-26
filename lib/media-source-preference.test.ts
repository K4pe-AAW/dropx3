import assert from "node:assert/strict"
import test from "node:test"
import { areUpToDateFullressDuplicates, preferUpToDateRawItems } from "./media-source-preference"
import type { Draft, RawItem } from "./types"

function raw(sourceName: string, title: string): RawItem {
  return {
    id: `${sourceName}:${title}`,
    sourceName,
    sourceUrl: `https://example.com/${encodeURIComponent(title)}`,
    title,
    publishedAt: "2026-10-26T00:00:00.000Z",
    fetchedAt: "2026-10-26T00:00:00.000Z",
  }
}

function draft(sourceName: string, title: string, styleCode?: string): Draft {
  return {
    id: `${sourceName}:${title}`,
    status: "pending",
    title,
    excerpt: "",
    bodyParagraphs: [],
    category: "sneaker",
    brands: [],
    tags: [],
    suggestedAffiliateSearch: [],
    sourceRefs: [{ name: sourceName, url: `https://example.com/${sourceName}` }],
    createdAt: "2026-10-26T00:00:00.000Z",
    ...(styleCode ? { suggestedColorways: [{ colorName: "", styleCode }] } : {}),
  }
}

test("同じ型番を扱うUPTODATEとFULLRESSはUPTODATEだけ残す", () => {
  const items = [
    raw("FULLRESS", "【2026年 10/30 発売】APB x NIKE AIR JORDAN 11 LOW SP [IU8266-400]"),
    raw("UPTODATE", "APB x Nike Air Jordan 11 Low SPが国内10月30日より発売［IU8266-400］"),
  ]
  assert.deepEqual(preferUpToDateRawItems(items).map((item) => item.sourceName), ["UPTODATE"])
})

test("型番が無くても商品名の一致が十分ならUPTODATEを優先する", () => {
  const items = [
    raw("FULLRESS", "NIKE RUNNING × OUR LEGACY WORK SHOP コラボが2027年 登場予定"),
    raw("UPTODATE", "OUR LEGACY WORK SHOP x Nike コラボコレクションが2027年に発売予定"),
  ]
  assert.deepEqual(preferUpToDateRawItems(items).map((item) => item.sourceName), ["UPTODATE"])
})

test("別型番やUPTODATE・FULLRESS以外の記事は統合しない", () => {
  const items = [
    raw("FULLRESS", "NIKE AIR MAX 95 Black [IQ0217-900]"),
    raw("UPTODATE", "Nike Air Max 95 White [IQ0217-100]"),
    raw("HYPEBEAST JAPAN", "NIKE AIR MAX 95 Black [IQ0217-900]"),
  ]
  assert.equal(preferUpToDateRawItems(items).length, 3)
})

test("生成済み下書きも構造化された型番一致で重複判定する", () => {
  assert.equal(
    areUpToDateFullressDuplicates(
      draft("Fullress", "NIKE AIR JORDAN 11 LOW", "IU8266-400"),
      draft("UP TO DATE", "APB x Nike Air Jordan 11 Low SP", "IU8266-400")
    ),
    true
  )
})
