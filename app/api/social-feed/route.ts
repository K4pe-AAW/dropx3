import { NextResponse } from "next/server"
import { buildSocialQueueDrafts, type SocialQueueState } from "@/lib/social-promotion"
import { readArticles } from "@/lib/storage"

export const dynamic = "force-dynamic"

/**
 * Typefully連携用の公開・読み取り専用フィード。
 * 公開済み記事から生成した投稿候補だけを返し、管理情報や秘密情報は含めない。
 */
export async function GET() {
  const now = new Date()
  const { articles } = await readArticles()
  const queue: SocialQueueState = {
    generatedAt: now.toISOString(),
    mode: "typefully",
    drafts: buildSocialQueueDrafts(articles, now),
  }
  return NextResponse.json(queue, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
  })
}
