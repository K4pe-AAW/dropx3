import { NextRequest, NextResponse } from "next/server"
import { readArticles, writeArticles } from "@/lib/storage"
import { isSafeExternalUrl } from "@/lib/affiliate"
import type { OfficialLink } from "@/lib/types"

/**
 * 一時admin API(本日一括公開した記事への公式リンク後付け用)。記事ID→公式URLの
 * マッピングを受け取り、officialLinksを設定する。単一トランザクション
 * (articles.jsonの読み書きは1回ずつ)。使用後削除。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const items: { id: string; url: string; label?: string }[] = Array.isArray(body?.items)
    ? body.items.filter(
        (i: unknown): i is { id: string; url: string; label?: string } =>
          typeof i === "object" &&
          i !== null &&
          typeof (i as Record<string, unknown>).id === "string" &&
          typeof (i as Record<string, unknown>).url === "string"
      )
    : []
  if (items.length === 0) return NextResponse.json({ error: "itemsが空です" }, { status: 400 })

  const data = await readArticles()
  let updated = 0
  const notFound: string[] = []

  for (const item of items) {
    if (!isSafeExternalUrl(item.url)) continue
    const article = data.articles.find((a) => a.id === item.id)
    if (!article) {
      notFound.push(item.id)
      continue
    }
    const link: OfficialLink = { label: item.label || "公式サイトで見る", url: item.url }
    article.officialLinks = [link]
    updated++
  }

  if (updated > 0) {
    data.lastUpdated = new Date().toISOString()
    await writeArticles(data)
  }

  return NextResponse.json({ updated, notFound })
}
