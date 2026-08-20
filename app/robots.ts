import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/site-config"

/**
 * AI検索（ChatGPT / Claude / Perplexity）に引用されることを狙って、検索・引用系の
 * クローラーを明示的に許可する。
 *
 * 注意: `User-agent: *` で既に許可されているので、この明示は方針の宣言であって
 * 「書かないとブロックされる」ものではない。学習用クローラー（GPTBot /
 * Google-Extended）はここに含めていない。許可/拒否は事業判断なので、
 * 変えるときは各事業者の最新のUA仕様を確認してから書くこと。
 */
const AI_SEARCH_AGENTS = [
  "OAI-SearchBot", // ChatGPTの検索インデックス
  "ChatGPT-User", // ユーザーがその場で開いた時の取得
  "Claude-SearchBot", // Claudeの検索インデックス
  "Claude-User", // 同上（ユーザー起点）
  "PerplexityBot",
]

const DISALLOW = ["/admin", "/api/"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_SEARCH_AGENTS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}
