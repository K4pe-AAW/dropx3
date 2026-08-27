import test from "node:test"
import assert from "node:assert/strict"
import { extractProductFactEvidence, prioritizeProductFacts } from "./product-fact-evidence"

test("価格と発売日の根拠行を本文の位置に関係なく抽出する", () => {
  const text = `商品説明です。\n${"情報 ".repeat(3000)}\n価格：￥24,200（税込）\n発売日：2026年9月12日（土）`
  const facts = extractProductFactEvidence(text)
  assert.ok(facts.some((line) => line.includes("￥24,200")))
  assert.ok(facts.some((line) => line.includes("2026年9月12日")))
})

test("文字数上限で本文後半が切れても根拠候補を先頭に残す", () => {
  const text = `${"前置き ".repeat(3000)}価格 16,500円（税込）。9月下旬発売。`
  const prioritized = prioritizeProductFacts(text, 1000)
  assert.ok(prioritized.includes("16,500円"))
  assert.ok(prioritized.includes("9月下旬発売"))
  assert.ok(prioritized.length <= 1000)
})

test("価格に似た単独の年や日付を価格として誤抽出しない", () => {
  assert.deepEqual(extractProductFactEvidence("2026年8月27日に記事を更新しました"), [])
})
