import { NextResponse } from "next/server"
import { readArticles, writeArticles } from "@/lib/storage"
import { sanitizeAffiliateLinks } from "@/lib/affiliate"

const LINK = {
  label: "メルカリで探す",
  retailer: "メルカリ",
  url: "https://px.a8.net/svt/ejp?a8mat=4BA1PB+31JS36+5LNQ+BW8O2&a8ejpredirect=https%3A%2F%2Fjp.mercari.com%2Fsearch%3Fkeyword%3D%E5%8F%A4%E7%9D%80",
}

export async function POST() {
  const [sanitized] = sanitizeAffiliateLinks([LINK])
  if (!sanitized) {
    return NextResponse.json({ error: "LINKのurlが不正です" }, { status: 500 })
  }

  const data = await readArticles()
  const updatedSlugs: string[] = []
  for (const article of data.articles) {
    if (article.category !== "vintage") continue
    const alreadyHas = article.affiliateLinks.some((l) => l.url === sanitized.url)
    if (!alreadyHas) {
      article.affiliateLinks.push(sanitized)
      updatedSlugs.push(article.slug)
    }
  }
  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)

  return NextResponse.json({ ok: true, updatedSlugs })
}
