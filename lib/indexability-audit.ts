import { parseRobotsTxt, pathAllowed, type RobotsRules } from "./source-watch/robots"

export const GOOGLEBOT_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

export type AuditIssue = {
  url: string
  kind: "robots" | "http" | "redirect" | "noindex" | "sitemap"
  detail: string
}

export function extractSitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    match[1]
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .trim()
  )
}

function selectRules(rules: RobotsRules, userAgent: string) {
  const normalized = userAgent.toLowerCase()
  const specific = rules
    .filter((group) => group.agent !== "*" && normalized.includes(group.agent))
    .sort((a, b) => b.agent.length - a.agent.length)[0]
  return specific ?? rules.find((group) => group.agent === "*")
}

export function isPathAllowedForGooglebot(robotsText: string, path: string): boolean {
  const rules = selectRules(parseRobotsTxt(robotsText), "googlebot")
  return rules ? pathAllowed(path, rules) : true
}

function hash(text: string): number {
  let value = 2166136261
  for (const character of text) {
    value ^= character.charCodeAt(0)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

export function selectDailyPublicUrls(
  sitemapUrls: string[],
  dayKey: string,
  options: { latestArticles?: number; rotatingArticles?: number } = {}
): string[] {
  const latestArticles = options.latestArticles ?? 12
  const rotatingArticles = options.rotatingArticles ?? 24
  const unique = [...new Set(sitemapUrls)]
  const fixed = unique.filter((url) => {
    const path = new URL(url).pathname
    return !path.startsWith("/articles/") && !path.startsWith("/brand/")
  })
  const articles = unique.filter((url) => new URL(url).pathname.startsWith("/articles/"))
  const brands = unique.filter((url) => new URL(url).pathname.startsWith("/brand/"))
  const latest = articles.slice(0, latestArticles)
  const latestSet = new Set(latest)
  const rotating = [...articles.filter((url) => !latestSet.has(url)), ...brands]
    .sort((a, b) => hash(`${dayKey}:${a}`) - hash(`${dayKey}:${b}`))
    .slice(0, rotatingArticles)

  return [...new Set([...fixed, ...latest, ...rotating])]
}

export function hasNoindex(html: string, xRobotsTag: string | null): boolean {
  if (/\bnoindex\b/i.test(xRobotsTag ?? "")) return true
  return /<meta\s+[^>]*(?:name|property)=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(html) ||
    /<meta\s+[^>]*content=["'][^"']*\bnoindex\b[^"']*["'][^>]*(?:name|property)=["']robots["']/i.test(html)
}
