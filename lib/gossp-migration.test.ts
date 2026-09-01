import assert from "node:assert/strict"
import test from "node:test"
import { convertRumorToGossp } from "./gossp-migration"

test("入れ子の公開データにある噂をすべてGossp!へ変換する", () => {
  const result = convertRumorToGossp({
    title: "噂｜新作が登場か",
    bodyParagraphs: ["発売の噂が浮上。", "確定情報ではありません。"],
    nested: { label: "噂・未確認" },
  })

  assert.deepEqual(result.value, {
    title: "Gossp!｜新作が登場か",
    bodyParagraphs: ["発売のGossp!が浮上。", "確定情報ではありません。"],
    nested: { label: "Gossp!・未確認" },
  })
  assert.equal(result.replacements, 3)
})

test("対象が無いデータは内容を変えない", () => {
  const input = { title: "公式発表", count: 1, enabled: true }
  const result = convertRumorToGossp(input)
  assert.deepEqual(result.value, input)
  assert.equal(result.replacements, 0)
})
