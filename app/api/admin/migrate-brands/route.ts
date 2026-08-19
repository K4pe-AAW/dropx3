import { NextResponse } from "next/server"
import { mutateArticles } from "@/lib/storage"
import { canonicalBrandNames } from "@/lib/brands"

/**
 * 一時admin API。lib/brands.tsのBRAND_ALIASES拡充(New Balance/ASICS/adidas/VANS/
 * ユニクロ/JOURNAL STANDARD等)を既存記事のbrands配列にも遡及適用する。単一トランザクション。
 * 使用後に削除すること。
 */
export async function POST() {
  const changed: { id: string; title: string; before: string[]; after: string[] }[] = []

  const result = await mutateArticles((data) => {
    const next = { ...data, articles: data.articles.map((a) => {
      const canon = canonicalBrandNames(a.brands)
      const isDiff = canon.length !== a.brands.length || canon.some((b, i) => b !== a.brands[i])
      if (!isDiff) return a
      changed.push({ id: a.id, title: a.title, before: a.brands, after: canon })
      return { ...a, brands: canon, updatedAt: new Date().toISOString() }
    }) }
    return next
  })

  return NextResponse.json({ changedCount: changed.length, changed, totalArticles: result.articles.length })
}
