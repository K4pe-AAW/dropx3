import { writeFile } from "node:fs/promises"
import {
  extractSitemapUrls,
  GOOGLEBOT_USER_AGENT,
  hasNoindex,
  isPathAllowedForGooglebot,
  selectDailyPublicUrls,
  type AuditIssue,
} from "../lib/indexability-audit"

const siteUrl = new URL(process.env.INDEXABILITY_SITE_URL ?? "https://dropx3.com")
const reportPath = process.env.INDEXABILITY_REPORT_PATH ?? "indexability-report.json"
const dayKey = new Date().toISOString().slice(0, 10)
const issues: AuditIssue[] = []

async function fetchWithRetry(url: string, init: RequestInit = {}): Promise<Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { "user-agent": GOOGLEBOT_USER_AGENT, accept: "text/html,application/xml;q=0.9,*/*;q=0.8", ...init.headers },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      })
      if (response.status !== 429 && response.status < 500) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000))
  }
  throw lastError
}

async function readRequired(url: string, label: string): Promise<string> {
  try {
    const response = await fetchWithRetry(url)
    if (!response.ok) {
      issues.push({ url, kind: label.includes("sitemap") ? "sitemap" : "http", detail: `${label}: HTTP ${response.status}` })
      return ""
    }
    return await response.text()
  } catch (error) {
    issues.push({ url, kind: label.includes("sitemap") ? "sitemap" : "http", detail: `${label}: ${String(error)}` })
    return ""
  }
}

async function auditPublicUrl(url: string, robotsText: string) {
  const parsed = new URL(url)
  if (parsed.origin !== siteUrl.origin) {
    issues.push({ url, kind: "sitemap", detail: `外部originがsitemapに混入: ${parsed.origin}` })
    return
  }
  if (parsed.pathname.startsWith("/admin") || parsed.pathname.startsWith("/api/")) {
    issues.push({ url, kind: "sitemap", detail: "意図的除外URLがsitemapに混入" })
    return
  }
  if (!isPathAllowedForGooglebot(robotsText, parsed.pathname)) {
    issues.push({ url, kind: "robots", detail: "公開URLがGooglebotに対してrobots.txtでブロック" })
    return
  }

  try {
    const response = await fetchWithRetry(url)
    if (!response.ok) {
      issues.push({ url, kind: "http", detail: `Googlebot GET: HTTP ${response.status}` })
      return
    }
    const finalUrl = new URL(response.url)
    if (finalUrl.origin !== siteUrl.origin || finalUrl.pathname.startsWith("/admin")) {
      issues.push({ url, kind: "redirect", detail: `不正な転送先: ${response.url}` })
      return
    }
    const html = await response.text()
    if (hasNoindex(html, response.headers.get("x-robots-tag"))) {
      issues.push({ url, kind: "noindex", detail: "公開URLにnoindexを検出" })
    }
  } catch (error) {
    issues.push({ url, kind: "http", detail: `Googlebot GET失敗: ${String(error)}` })
  }
}

async function main() {
  const robotsUrl = new URL("/robots.txt", siteUrl).toString()
  const sitemapUrl = new URL("/sitemap.xml", siteUrl).toString()
  const newsSitemapUrl = new URL("/news-sitemap.xml", siteUrl).toString()
  const robotsText = await readRequired(robotsUrl, "robots.txt")
  const sitemapXml = await readRequired(sitemapUrl, "sitemap.xml")
  const newsSitemapXml = await readRequired(newsSitemapUrl, "news-sitemap.xml")

  if (robotsText) {
    for (const requiredPath of ["/", "/articles/indexability-audit"]) {
      if (!isPathAllowedForGooglebot(robotsText, requiredPath)) {
        issues.push({ url: new URL(requiredPath, siteUrl).toString(), kind: "robots", detail: "Googlebotの公開クロールが禁止" })
      }
    }
    for (const excludedPath of ["/admin", "/api/admin/private"]) {
      if (isPathAllowedForGooglebot(robotsText, excludedPath)) {
        issues.push({ url: new URL(excludedPath, siteUrl).toString(), kind: "robots", detail: "管理/API URLがrobots.txtで除外されていない" })
      }
    }
  }

  const sitemapUrls = extractSitemapUrls(sitemapXml)
  const newsUrls = extractSitemapUrls(newsSitemapXml)
  if (sitemapXml && sitemapUrls.length === 0) issues.push({ url: sitemapUrl, kind: "sitemap", detail: "URLが0件" })
  if (newsSitemapXml && newsUrls.length === 0) issues.push({ url: newsSitemapUrl, kind: "sitemap", detail: "ニュースURLが0件" })

  const sampledUrls = selectDailyPublicUrls([...sitemapUrls, ...newsUrls], dayKey)
  const concurrency = 5
  for (let index = 0; index < sampledUrls.length; index += concurrency) {
    await Promise.all(sampledUrls.slice(index, index + concurrency).map((url) => auditPublicUrl(url, robotsText)))
  }

  const report = {
    checkedAt: new Date().toISOString(),
    site: siteUrl.origin,
    sitemapUrlCount: sitemapUrls.length,
    newsSitemapUrlCount: newsUrls.length,
    sampledPublicUrlCount: sampledUrls.length,
    ignoredExpectedExclusions: ["/admin", "/api/"],
    issues,
  }
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")

  console.log(`Indexability audit: ${sampledUrls.length} public URLs checked / ${issues.length} issue(s)`)
  for (const issue of issues) console.error(`- [${issue.kind}] ${issue.url} — ${issue.detail}`)
  if (issues.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
