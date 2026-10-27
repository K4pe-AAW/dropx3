/**
 * 検索順位・AI検索の引用に寄与せず、全記事を大量巡回していたクローラーだけを抑制する。
 * Google/Bing/OAI-SearchBot/ChatGPT-User/Claude-SearchBot/Claude-User/PerplexityBotと、
 * X・Facebookのリンクプレビューはここへ含めない。
 */
export const BLOCKED_CRAWLER_AGENTS = [
  "MJ12bot",
  "AhrefsBot",
  "SemrushBot",
  "SERankingBacklinksBot",
  "serpstatbot",
  "ElevenlabsCrawler",
  "Reflectionbot",
  "Amazonbot",
  "ClaudeBot",
  "GPTBot",
] as const

const BLOCKED_CRAWLER_TOKENS = BLOCKED_CRAWLER_AGENTS.map((agent) => agent.toLowerCase())

export function isBlockedCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false
  const normalized = userAgent.toLowerCase()
  return BLOCKED_CRAWLER_TOKENS.some((token) => normalized.includes(token))
}
