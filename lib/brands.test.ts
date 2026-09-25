import assert from "node:assert/strict"
import test from "node:test"
import { canonicalBrandName, canonicalBrandNames } from "./brands"

test("記号・登録商標によるブランド表記揺れを統合する", () => {
  assert.equal(canonicalBrandName("'47"), "’47")
  assert.equal(canonicalBrandName("A BATHING APE®"), "A BATHING APE")
  assert.deepEqual(canonicalBrandNames(["BAPE", "A BATHING APE®"]), ["A BATHING APE"])
})
