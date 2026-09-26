import assert from "node:assert/strict"
import test from "node:test"
import { buildSeoOpportunities } from "./seo-performance"

test("順位4〜20位で低CTRの記事を優先する", () => {
  const result = buildSeoOpportunities([
    { page: "https://dropx3.com/a", clicks: 1, impressions: 100, ctr: 0.01, position: 8 },
    { page: "https://dropx3.com/b", clicks: 20, impressions: 100, ctr: 0.2, position: 2 },
  ])
  assert.equal(result.length, 1)
  assert.equal(result[0].page, "https://dropx3.com/a")
})

test("少量表示は改善キューへ入れない", () => {
  assert.equal(buildSeoOpportunities([{ page: "x", clicks: 0, impressions: 3, ctr: 0, position: 9 }]).length, 0)
})
