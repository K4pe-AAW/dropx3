import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

const PRIORITY_BRANDS = ["nike", "new balance", "newbalance", "asics", "アシックス", "adidas", "アディダス", "ナイキ", "ニューバランス"]

export async function GET() {
  const articles = await getAllArticles()

  const noAffiliateLinks = articles.filter((a) => !a.affiliateLinks || a.affiliateLinks.length === 0)
  const noOfficialLinks = articles.filter((a) => !a.officialLinks || a.officialLinks.length === 0)
  const featuredCount = articles.filter((a) => a.featured).length
  const withRelatedArticles = articles.filter((a) => a.relatedArticles && a.relatedArticles.length > 0)
  const withPurchaseChannels = articles.filter((a) => a.purchaseChannels && a.purchaseChannels.length > 0)
  const withColorways = articles.filter((a) => a.colorways && a.colorways.length > 0)

  const priorityBrandArticles = articles.filter((a) =>
    a.brands.some((b) => PRIORITY_BRANDS.some((p) => b.toLowerCase().includes(p)))
  )

  const byCategory: Record<string, number> = {}
  for (const a of articles) byCategory[a.category] = (byCategory[a.category] ?? 0) + 1

  const noAffiliateByCategory: Record<string, number> = {}
  for (const a of noAffiliateLinks) noAffiliateByCategory[a.category] = (noAffiliateByCategory[a.category] ?? 0) + 1

  const brandCounts = new Map<string, number>()
  for (const a of articles) for (const b of a.brands) brandCounts.set(b, (brandCounts.get(b) ?? 0) + 1)
  const brandDistribution = Array.from(brandCounts.entries()).sort((a, b) => b[1] - a[1])
  const brandsWithMultipleArticles = brandDistribution.filter(([, count]) => count >= 3)

  return NextResponse.json({
    totalArticles: articles.length,
    byCategory,
    noAffiliateLinks: { count: noAffiliateLinks.length, byCategory: noAffiliateByCategory, titles: noAffiliateLinks.map((a) => ({ slug: a.slug, title: a.title, category: a.category })) },
    noOfficialLinks: { count: noOfficialLinks.length },
    featuredCount,
    withRelatedArticles: { count: withRelatedArticles.length, titles: withRelatedArticles.map((a) => a.title) },
    withPurchaseChannels: withPurchaseChannels.length,
    withColorways: withColorways.length,
    priorityBrandArticles: { count: priorityBrandArticles.length, titles: priorityBrandArticles.map((a) => ({ title: a.title, brands: a.brands })) },
    brandDistribution: { totalUniqueBrands: brandDistribution.length, brandsWithThreePlusArticles: brandsWithMultipleArticles },
  })
}
