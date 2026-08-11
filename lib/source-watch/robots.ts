import type { RobotsVerdict } from "./types"

/** SOURCE WATCHの巡回botが名乗るUser-Agent。robots.txt側がこの名前を名指しでDisallowしていれば必ず従う */
export const SOURCE_WATCH_USER_AGENT = "DropwireSourceWatch"

export type RobotsRules = { agent: string; disallow: string[]; allow: string[] }[]

export function parseRobotsTxt(text: string): RobotsRules {
  const groups: RobotsRules = []
  let current: RobotsRules[number] | null = null

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/#.*$/, "").trim()
    if (!line) continue
    const [rawKey, ...rest] = line.split(":")
    const key = rawKey?.trim().toLowerCase()
    const value = rest.join(":").trim()
    if (key === "user-agent") {
      // 同じUser-agentが連続する場合はグループを継続する(標準的なrobots.txtの書き方)
      const existing = groups.find((g) => g.agent === value.toLowerCase() && groups.indexOf(g) === groups.length - 1)
      current = existing ?? { agent: value.toLowerCase(), disallow: [], allow: [] }
      if (!existing) groups.push(current)
    } else if (key === "disallow" && current) {
      if (value) current.disallow.push(value)
    } else if (key === "allow" && current) {
      if (value) current.allow.push(value)
    }
  }
  return groups
}

export function pathAllowed(path: string, rules: { disallow: string[]; allow: string[] }): boolean {
  // 最長一致のルールを優先する(標準的なrobots.txtの解釈)
  const toRegex = (pattern: string) =>
    new RegExp(
      "^" +
        pattern
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\$$/, "$") +
        (pattern.endsWith("$") ? "" : "")
    )

  let bestMatch: { length: number; allowed: boolean } | null = null
  for (const d of rules.disallow) {
    if (d === "") continue // 空のDisallowは「すべて許可」を意味する
    if (toRegex(d).test(path) && (!bestMatch || d.length > bestMatch.length)) {
      bestMatch = { length: d.length, allowed: false }
    }
  }
  for (const a of rules.allow) {
    if (toRegex(a).test(path) && (!bestMatch || a.length > bestMatch.length)) {
      bestMatch = { length: a.length, allowed: true }
    }
  }
  return bestMatch ? bestMatch.allowed : true
}

const robotsCache = new Map<string, { rules: RobotsRules; fetchedAt: number; found: boolean }>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30分。毎回fetchせず、かつ古すぎる判定を使い続けないバランス

/**
 * originのrobots.txtを取得しUAごとの許可/禁止を判定する。
 * robots.txtが存在しない(404等)場合は規約上「すべて許可」として扱うが、verdictは"not_found"にして
 * 判別できるようにする。取得自体に失敗した場合は安全側に倒して"unknown"=禁止扱いにする。
 */
export async function checkRobots(
  origin: string,
  path: string
): Promise<{ allowed: boolean; verdict: RobotsVerdict }> {
  let cached = robotsCache.get(origin)
  if (!cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
    try {
      const res = await fetch(`${origin}/robots.txt`, {
        headers: { "User-Agent": `${SOURCE_WATCH_USER_AGENT}/1.0 (+https://dropx3.com)` },
        signal: AbortSignal.timeout(8000),
      })
      if (res.status === 404) {
        cached = { rules: [], fetchedAt: Date.now(), found: false }
      } else if (res.ok) {
        const text = await res.text()
        cached = { rules: parseRobotsTxt(text), fetchedAt: Date.now(), found: true }
      } else {
        // 403等でrobots.txtすら読めない場合は安全側で「不明」扱い(禁止と同等に扱う)
        robotsCache.set(origin, { rules: [], fetchedAt: Date.now(), found: false })
        return { allowed: false, verdict: "unknown" }
      }
      robotsCache.set(origin, cached)
    } catch {
      return { allowed: false, verdict: "unknown" }
    }
  }

  if (!cached.found) return { allowed: true, verdict: "not_found" }

  const uaLower = SOURCE_WATCH_USER_AGENT.toLowerCase()
  const specific = cached.rules.find((g) => g.agent === uaLower)
  const wildcard = cached.rules.find((g) => g.agent === "*")
  const group = specific ?? wildcard
  if (!group) return { allowed: true, verdict: "allowed" }

  const allowed = pathAllowed(path, group)
  return { allowed, verdict: allowed ? "allowed" : "disallowed" }
}
