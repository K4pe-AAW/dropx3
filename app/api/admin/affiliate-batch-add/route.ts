import { NextRequest, NextResponse } from "next/server"
import { readArticles, writeArticles } from "@/lib/storage"
import { sanitizeAffiliateLinks } from "@/lib/affiliate"
import type { AffiliateLink } from "@/lib/types"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })

  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : []
  const link = body.link as AffiliateLink
  if (ids.length === 0 || !link?.url || !link?.label || !link?.retailer) {
    return NextResponse.json({ error: "ids(配列)とlink({label,retailer,url})が必須です" }, { status: 400 })
  }
  const [sanitized] = sanitizeAffiliateLinks([link])
  if (!sanitized) {
    return NextResponse.json({ error: "linkのurlが不正です" }, { status: 400 })
  }

  const data = await readArticles()
  let updated = 0
  for (const article of data.articles) {
    if (!ids.includes(article.id)) continue
    const alreadyHas = article.affiliateLinks.some((l) => l.url === sanitized.url)
    if (!alreadyHas) {
      article.affiliateLinks.push(sanitized)
      updated++
    }
  }
  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)

  return NextResponse.json({ ok: true, updated })
}
