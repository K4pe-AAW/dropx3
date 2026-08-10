import { NextResponse } from "next/server"
import { readArticles, writeArticles } from "@/lib/storage"
import { buildMercariSearchLink } from "@/lib/affiliate"

// 既存記事の汎用検索("スニーカー"/"古着")を商品名ベースの検索語へ置き換えるための手動キュレーション済みマッピング
const QUERY_BY_ARTICLE_ID: Record<string, string> = {
  d050d335b3d7d47e1ad7fe809339b8cd: "ワークジャケット",
  "4784b9429d900912888ab70769b2c73a": "Nike Air Max 90 IM9616-001",
  c023763a9fd3f162e090afcb44bf08cf: "Nike Air Max 90 SP IR1953-200",
  "9b12db00114e08cb232dc6095ef9e7ac": "Nike Air Jordan 3 Sport Renaissance CK9246-400",
  d0d666ff3026044c426bcc61803dadaf: "花柄シャツ",
  "123b91db250f8c4c80c322ef00b4b411": "HELMUT LANG デニムショーツ",
  "1c2186720b20dc508eb80b6a365cc8ed": "adidas F50 Ghost Sprint",
  c81e8598bb9aa34974648f083c99818e: "New Balance 204V Neo Flame",
  d6493ab650e621b3536a320ec1d40310: "asics VANDY THE PINK",
  edc0e6fa587430111593573b31a5ae61: "Nike Air Jordan 6 Retro Oreo",
  b4c48fa5c36bae722646e68c3520321d: "Nike Air Jordan 17 Low Black Patent",
  d30540083c6949d5b96a61936d3dd1be: "Nike Air Jordan 1 Nails Grails",
  "7cf0f932a2c254327af3a74d02ef73a9": "Nike Air Jordan 16 Free The Youth",
  e675224c1fccb1423f6824293e450fd4: "Nike Air Jordan 6 Retro Oreo",
  d9b748e63e1ca7e17ac25b787fd333c5: "Nike SB Dunk Low Pro",
  "53cfe542130fdae1f16769a3b3c8831a": "New Balance 990v7",
  ed341d58d444a4804f7513c1731f3930: "Nike Air Jordan 17 Low",
  "088035583626a0b0be09517a905cd7cb": "Mizuno Wave Prophecy LS",
  f77d38666747394281a899e0e937a36b: "adidas Yeezy 800",
  "6c502f0b471c745c1fddc825aedd8b58": "Nike KD6 PSG",
  "62e347111ccaea9e8bd417dd30cc66e4": "Nike Air Max 95 デニム",
  "0df022f7986d2a304f362ef4b15308cd": "ROOM 三軒茶屋 古着",
  f851aa930103808f093d6358c40310e1: "le coq sportif ムーミン キャップ",
  "871d0e5a6055a1f008461f2db5588016": "HOKA Tor Ultra Lo",
}

export async function POST() {
  const data = await readArticles()
  const updated: { id: string; slug: string; oldUrl?: string; newQuery: string }[] = []
  const errors: { id: string; error: string }[] = []

  for (const article of data.articles) {
    const query = QUERY_BY_ARTICLE_ID[article.id]
    if (!query) continue

    const mercariIndex = article.affiliateLinks.findIndex((l) => l.url.includes("mercari.com"))
    if (mercariIndex === -1) continue

    try {
      const newLink = buildMercariSearchLink(query)
      const oldUrl = article.affiliateLinks[mercariIndex].url
      if (oldUrl === newLink.url) continue
      article.affiliateLinks[mercariIndex] = newLink
      updated.push({ id: article.id, slug: article.slug, oldUrl, newQuery: query })
    } catch (err) {
      errors.push({ id: article.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)

  return NextResponse.json({ ok: true, updatedCount: updated.length, updated, errors })
}
