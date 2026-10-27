import assert from "node:assert/strict"
import test from "node:test"
import { isBlockedCrawler } from "./crawler-policy"

test("大量巡回する低価値crawlerを遮断する", () => {
  assert.equal(isBlockedCrawler("Mozilla/5.0 (compatible; MJ12bot/v1.4.8)"), true)
  assert.equal(isBlockedCrawler("Mozilla/5.0 (compatible; AhrefsBot/7.0)"), true)
  assert.equal(isBlockedCrawler("Mozilla/5.0 (compatible; ClaudeBot/1.0)"), true)
})

test("検索・AI検索・SNSプレビューcrawlerは維持する", () => {
  assert.equal(isBlockedCrawler("Googlebot/2.1"), false)
  assert.equal(isBlockedCrawler("OAI-SearchBot/1.4"), false)
  assert.equal(isBlockedCrawler("ChatGPT-User/1.0"), false)
  assert.equal(isBlockedCrawler("Claude-SearchBot/1.0"), false)
  assert.equal(isBlockedCrawler("Claude-User/1.0"), false)
  assert.equal(isBlockedCrawler("PerplexityBot/1.0"), false)
  assert.equal(isBlockedCrawler("Twitterbot/1.0"), false)
  assert.equal(isBlockedCrawler("facebookexternalhit/1.1"), false)
})

test("通常ブラウザと空UAは遮断しない", () => {
  assert.equal(isBlockedCrawler("Mozilla/5.0 AppleWebKit/537.36 Chrome/152 Safari/537.36"), false)
  assert.equal(isBlockedCrawler(null), false)
})
