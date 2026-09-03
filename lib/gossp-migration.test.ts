import assert from "node:assert/strict"
import test from "node:test"
import { convertRumorToGossp, normalizeGosspLabel } from "./gossp-migration"

test("入れ子の公開データにある噂をすべてGoss!pへ変換する", () => {
  const result = convertRumorToGossp({
    title: "噂｜新作が登場か",
    bodyParagraphs: ["発売の噂が浮上。", "確定情報ではありません。"],
    nested: { label: "噂・未確認" },
  })

  assert.deepEqual(result.value, {
    title: "Goss!p｜新作が登場か",
    bodyParagraphs: ["発売のGoss!pが浮上。", "確定情報ではありません。"],
    nested: { label: "Goss!p・未確認" },
  })
  assert.equal(result.replacements, 3)
})

test("入れ子の既存データにある旧表記Gossp!をGoss!pへ正規化する", () => {
  const result = normalizeGosspLabel({
    title: "Gossp!｜新作が登場か",
    paragraphs: ["Gossp!・未確認情報です。", "変更される可能性があります。"],
  })

  assert.deepEqual(result.value, {
    title: "Goss!p｜新作が登場か",
    paragraphs: ["Goss!p・未確認情報です。", "変更される可能性があります。"],
  })
  assert.equal(result.replacements, 2)
})

test("対象が無いデータは内容を変えない", () => {
  const input = { title: "公式発表", count: 1, enabled: true }
  const result = convertRumorToGossp(input)
  assert.deepEqual(result.value, input)
  assert.equal(result.replacements, 0)
})
