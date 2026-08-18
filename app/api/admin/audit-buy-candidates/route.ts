import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

const TARGET_BRANDS = ["ovy", "new balance", "ニューバランス"]

export async function GET() {
  const articles = await getAllArticles()

  const buyExample = articles.find((a) => a.relatedArticles && a.relatedArticles.length > 0)

  const candidates = articles
    .filter((a) => a.brands.some((b) => TARGET_BRANDS.some((t) => b.toLowerCase().includes(t))))
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      brands: a.brands,
      publishedAt: a.publishedAt,
      excerpt: a.excerpt,
      bodyParagraphs: a.bodyParagraphs,
      affiliateLinks: a.affiliateLinks,
      officialLinks: a.officialLinks,
      hasColorways: !!(a.colorways && a.colorways.length),
      hasPurchaseChannels: !!(a.purchaseChannels && a.purchaseChannels.length),
    }))

  return NextResponse.json({ buyExample, candidates })
}
