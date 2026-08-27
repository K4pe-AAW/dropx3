import test from "node:test"
import assert from "node:assert/strict"
import * as cheerio from "cheerio"
import { extractCommerceLinkCandidatesFromHtml } from "./html"

test("抽選応募・販売ページをURL付きで収集し、一般リンクは除外する", () => {
  const $ = cheerio.load(`
    <a href="/news">ニュース一覧</a>
    <a href="/raffle/123#form">WEB抽選に応募する</a>
    <a href="https://shop.example.jp/products/1">オンラインストアで購入</a>
  `)
  assert.deepEqual(extractCommerceLinkCandidatesFromHtml($, "https://example.jp/article"), [
    { label: "WEB抽選に応募する", url: "https://example.jp/raffle/123" },
    { label: "オンラインストアで購入", url: "https://shop.example.jp/products/1" },
  ])
})
