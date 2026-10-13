import assert from "node:assert/strict"
import test from "node:test"
import { BRAND_HUBS, getBrandHubProfile } from "./brand-hubs"

test("重点5ブランドだけを常設ハブとして定義する", () => {
  assert.deepEqual(BRAND_HUBS.map((profile) => profile.name), ["A.PRESSE", "COMOLI", "AURALEE", "Graphpaper", "NICENESS"])
})

test("表記揺れから重点ブランド設定を取得する", () => {
  assert.equal(getBrandHubProfile("A Presse")?.name, "A.PRESSE")
  assert.equal(getBrandHubProfile("Nike"), undefined)
})
