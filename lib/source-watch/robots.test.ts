import { test } from "node:test"
import assert from "node:assert/strict"
import { parseRobotsTxt, pathAllowed } from "./robots"

test("parseRobotsTxt: User-agent: * のDisallow: /はすべてのパスを禁止する", () => {
  const rules = parseRobotsTxt("User-agent: *\nDisallow: /\n")
  const group = rules.find((g) => g.agent === "*")!
  assert.equal(pathAllowed("/any/path", group), false)
})

test("parseRobotsTxt: 空のDisallowは全許可を意味する", () => {
  const rules = parseRobotsTxt("User-agent: *\nDisallow:\n")
  const group = rules.find((g) => g.agent === "*")!
  assert.equal(pathAllowed("/any/path", group), true)
})

test("parseRobotsTxt: 特定UA(ClaudeBot等)へのDisallowは*グループに影響しない", () => {
  const text = `User-agent: *\nAllow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n`
  const rules = parseRobotsTxt(text)
  const wildcard = rules.find((g) => g.agent === "*")!
  const claudeBot = rules.find((g) => g.agent === "claudebot")!
  assert.equal(pathAllowed("/news/foo", wildcard), true)
  assert.equal(pathAllowed("/news/foo", claudeBot), false)
})

test("pathAllowed: 特定パスのDisallowはそのパス配下のみ禁止し、他は許可する", () => {
  const rules = parseRobotsTxt("User-agent: *\nDisallow: /admin\nDisallow: /cart\n")
  const group = rules.find((g) => g.agent === "*")!
  assert.equal(pathAllowed("/admin/settings", group), false)
  assert.equal(pathAllowed("/news/some-article", group), true)
})

test("pathAllowed: より長く一致するAllowがDisallowより優先される", () => {
  const rules = parseRobotsTxt("User-agent: *\nDisallow: /collections/\nAllow: /collections/sneakers\n")
  const group = rules.find((g) => g.agent === "*")!
  assert.equal(pathAllowed("/collections/sneakers", group), true)
  assert.equal(pathAllowed("/collections/other", group), false)
})
