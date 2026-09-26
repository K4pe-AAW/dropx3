export type GscPageRow = {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type SeoOpportunity = GscPageRow & {
  reason: string
  score: number
}

export type SearchPerformanceSnapshot = {
  period?: { start?: string; end?: string }
  fetchedAt?: string
  gsc?: { byPage?: GscPageRow[] | { error: string }; byQuery?: Array<Record<string, unknown>> | { error: string } }
}

export function buildSeoOpportunities(rows: GscPageRow[]): SeoOpportunity[] {
  return rows
    .filter((row) => row.impressions >= 10)
    .map((row) => {
      const lowCtr = row.ctr < 0.05
      const strikingDistance = row.position >= 4 && row.position <= 20
      const noClicks = row.clicks === 0 && row.impressions >= 20
      const reason = noClicks
        ? `表示${row.impressions}回・クリック0。タイトルと要約を優先確認`
        : strikingDistance && lowCtr
          ? `平均${row.position.toFixed(1)}位・CTR ${(row.ctr * 100).toFixed(1)}%。公式情報と検索意図を確認`
          : strikingDistance
            ? `平均${row.position.toFixed(1)}位。追記・内部リンクで上位を狙える候補`
            : "表示回数が多い記事"
      const score = (noClicks ? 80 : 0) + (strikingDistance ? 50 : 0) + (lowCtr ? 30 : 0) + Math.log2(row.impressions + 1) * 5
      return { ...row, reason, score }
    })
    .filter((row) => row.position >= 4 && row.position <= 20 || row.clicks === 0 && row.impressions >= 20)
    .sort((a, b) => b.score - a.score || b.impressions - a.impressions)
}

export function renderSeoPerformanceMarkdown(snapshot: SearchPerformanceSnapshot, sourcePath: string): string {
  const rows = Array.isArray(snapshot.gsc?.byPage) ? snapshot.gsc.byPage : []
  const opportunities = buildSeoOpportunities(rows)
  const queries = Array.isArray(snapshot.gsc?.byQuery) ? snapshot.gsc.byQuery.slice(0, 20) : []
  const lines = [
    "---",
    "status: 運用中",
    "category: SEO改善",
    `last_synced: ${new Date().toISOString()}`,
    "tags:",
    "  - DROP-DROP-DROP",
    "  - SEO",
    "  - Search-Console",
    "---",
    "",
    "# DROP DROP DROP SEO Improvement Queue",
    "",
    `> Growth OSの読み取り専用データから自動生成。対象期間: ${snapshot.period?.start ?? "?"}〜${snapshot.period?.end ?? "?"}。データ: ${sourcePath}`,
    "",
    "## 優先改善候補",
    "",
    ...(opportunities.length ? opportunities.slice(0, 20).map((row) => {
      const href = row.page.startsWith("https://dropx3.com") ? row.page : "https://dropx3.com/"
      return `- [ ] [${href}](${href}) — ${row.reason}`
    }) : ["- 現在、条件に該当するページはありません。"]),
    "",
    "## 検索需要",
    "",
    "| クエリ | クリック | 表示 | CTR | 順位 |",
    "|---|---:|---:|---:|---:|",
    ...queries.map((row) => `| ${String(row.query ?? "").replaceAll("|", "\\|")} | ${Number(row.clicks ?? 0)} | ${Number(row.impressions ?? 0)} | ${(Number(row.ctr ?? 0) * 100).toFixed(1)}% | ${Number(row.position ?? 0).toFixed(1)} |`),
    "",
    "## 自動運用ルール",
    "",
    "- 順位4〜20位、または表示20回以上でクリック0の記事を候補化する",
    "- タイトル変更は実データと記事内容が一致する場合だけ行う",
    "- 記事数・画像数は減らさない",
    "- キーワードを本文へ不自然に反復しない",
    "",
  ]
  return lines.join("\n")
}
