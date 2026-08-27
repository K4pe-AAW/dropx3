const PRICE_PATTERN = /(?:¥|￥|JPY\s*)\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s*\([^)]*税込[^)]*\)|\s*税込)?|\d{1,3}(?:,\d{3})+\s*円(?:\s*\([^)]*税込[^)]*\)|\s*\(税込\)|\s*税込)?/gi
const RELEASE_PATTERN = /(?:発売日|発売予定日|販売開始日?|予約開始日?|リリース(?:日|予定)?|release\s*date|available\s+(?:from|on))\s*[:：]?\s*[^。\n|]{0,50}?(?:\d{4}[年/.\-]\s*)?\d{1,2}[月/.\-]\d{1,2}日?(?:\s*\([^)]{0,12}\))?|(?:\d{4}年\s*)?\d{1,2}月(?:上旬|中旬|下旬|\d{1,2}日)(?:\s*より)?\s*(?:発売|販売開始|リリース)/gi

function normalizedLines(text: string): string[] {
  return text
    .replace(/\r/g, "\n")
    .replace(/[\t\u00a0]+/g, " ")
    .split(/\n|(?<=[。！？])/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
}

function collectMatches(text: string, pattern: RegExp, limit: number): string[] {
  const found: string[] = []
  const seen = new Set<string>()
  for (const line of normalizedLines(text)) {
    pattern.lastIndex = 0
    const match = pattern.exec(line)
    if (!match) continue
    // 長い1行のHTMLテキストでも一致箇所を切り落とさないよう、先頭ではなく一致周辺を残す。
    const start = Math.max(0, match.index - 80)
    const compact = line.slice(start, start + 240)
    if (seen.has(compact)) continue
    seen.add(compact)
    found.push(compact)
    if (found.length >= limit) break
  }
  return found
}

/**
 * 長いECページや貼り付け本文のどこに情報があっても、価格・発売日の根拠行をAI入力の先頭へ移す。
 * 値の確定はAIと人間のレビューに任せ、ここでは「見落とさない」ための候補抽出だけを行う。
 */
export function extractProductFactEvidence(text: string): string[] {
  return [
    ...collectMatches(text, PRICE_PATTERN, 8).map((line) => `価格候補: ${line}`),
    ...collectMatches(text, RELEASE_PATTERN, 8).map((line) => `発売日候補: ${line}`),
  ]
}

export function prioritizeProductFacts(text: string, maxLength: number): string {
  const evidence = extractProductFactEvidence(text)
  if (evidence.length === 0) return text.slice(0, maxLength)
  const prefix = `【機械抽出した価格・発売日の根拠候補（本文と照合して使用）】\n${evidence.join("\n")}\n【本文】\n`
  return `${prefix}${text.slice(0, Math.max(0, maxLength - prefix.length))}`.slice(0, maxLength)
}
