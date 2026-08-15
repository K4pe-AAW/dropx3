import { test } from "node:test"
import assert from "node:assert/strict"
import { trackEvent, classifyAffiliateNetwork, linkDomain } from "./analytics"

function withMockGtag(run: (calls: unknown[][]) => void) {
  const calls: unknown[][] = []
  ;(globalThis as unknown as { window?: unknown }).window = {
    gtag: (...args: unknown[]) => calls.push(args),
  }
  try {
    run(calls)
  } finally {
    delete (globalThis as unknown as { window?: unknown }).window
  }
}

test("trackEvent: windowが無ければ例外を投げずにno-op", () => {
  assert.doesNotThrow(() => {
    trackEvent("search_submit", { search_term: "test", result_count: 0 })
  })
})

test("trackEvent: window.gtagが関数でなければno-op", () => {
  ;(globalThis as unknown as { window?: unknown }).window = {}
  try {
    assert.doesNotThrow(() => {
      trackEvent("search_submit", { search_term: "test", result_count: 0 })
    })
  } finally {
    delete (globalThis as unknown as { window?: unknown }).window
  }
})

test("trackEvent: gtagにevent名とパラメータを渡す", () => {
  withMockGtag((calls) => {
    trackEvent("brand_select", { brand: "HOKA", placement: "sidebar" })
    assert.equal(calls.length, 1)
    assert.equal(calls[0][0], "event")
    assert.equal(calls[0][1], "brand_select")
    const params = calls[0][2] as Record<string, unknown>
    assert.equal(params.brand, "HOKA")
    assert.equal(params.placement, "sidebar")
  })
})

test("trackEvent: undefinedのパラメータは送らない", () => {
  withMockGtag((calls) => {
    trackEvent("brand_select", { brand: "HOKA", category: undefined })
    const params = calls[0][2] as Record<string, unknown>
    assert.equal("category" in params, false)
  })
})

test("trackEvent: 100文字を超える文字列パラメータは切り詰める", () => {
  withMockGtag((calls) => {
    const longTerm = "あ".repeat(150)
    trackEvent("search_submit", { search_term: longTerm, result_count: 3 })
    const params = calls[0][2] as Record<string, unknown>
    assert.equal((params.search_term as string).length, 100)
  })
})

test("classifyAffiliateNetwork: 楽天系はrakuten", () => {
  assert.equal(classifyAffiliateNetwork("楽天市場"), "rakuten")
  assert.equal(classifyAffiliateNetwork("Rakuten Ichiba"), "rakuten")
})

test("classifyAffiliateNetwork: Amazon系(大小文字・カナ表記)はamazon", () => {
  assert.equal(classifyAffiliateNetwork("Amazon"), "amazon")
  assert.equal(classifyAffiliateNetwork("amazon.co.jp"), "amazon")
  assert.equal(classifyAffiliateNetwork("アマゾンアソシエイト"), "amazon")
})

test("classifyAffiliateNetwork: 該当なしはother", () => {
  assert.equal(classifyAffiliateNetwork("SNKRDUNK"), "other")
  assert.equal(classifyAffiliateNetwork("ZOZOTOWN"), "other")
  assert.equal(classifyAffiliateNetwork("メルカリ"), "other")
  assert.equal(classifyAffiliateNetwork("Yahoo!ショッピング"), "other")
})

test("linkDomain: URLからホスト名を取り出す", () => {
  assert.equal(linkDomain("https://www.youtube.com/watch?v=abc123"), "www.youtube.com")
  assert.equal(linkDomain("https://auralee.jp/products/x"), "auralee.jp")
})

test("linkDomain: 不正なURLは空文字", () => {
  assert.equal(linkDomain("not a url"), "")
})
