import { NextRequest, NextResponse } from "next/server"
import { listProducts } from "@/lib/source-watch/storage"
import { listProductCards } from "@/lib/source-watch/present"

export const dynamic = "force-dynamic"

function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of items) {
    const k = key(item)
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const allProducts = await listProducts()
  const activeProducts = allProducts.filter((p) => p.reviewStatus !== "ignored" && !p.social)
  const socialProducts = allProducts.filter((p) => p.social)
  const cards = await listProductCards(activeProducts)

  const readinessCount = countBy(cards, (c) => c.product.readiness)
  const tierCount = countBy(cards, (c) => c.product.tier)
  const imageLevelCount = countBy(cards, (c) => c.imageStatus.level)
  const missingFacetCount: Record<string, number> = {}
  for (const c of cards) {
    for (const f of c.missingFacets) missingFacetCount[f] = (missingFacetCount[f] ?? 0) + 1
  }

  const confirmedButNoUsableImage = cards.filter((c) => c.product.tier === "CONFIRMED" && c.imageStatus.level !== "usable")
  const confirmedWithUsableImage = cards.filter((c) => c.product.tier === "CONFIRMED" && c.imageStatus.level === "usable")
  const readyCount = cards.filter((c) => c.product.readiness === "READY").length

  return NextResponse.json({
    totalActive: activeProducts.length,
    totalSocial: socialProducts.length,
    totalIgnored: allProducts.length - activeProducts.length - socialProducts.length,
    readinessCount,
    tierCount,
    imageLevelCount,
    missingFacetCount,
    confirmedTotal: (tierCount.CONFIRMED ?? 0),
    confirmedButNoUsableImageCount: confirmedButNoUsableImage.length,
    confirmedWithUsableImageCount: confirmedWithUsableImage.length,
    readyCount,
    confirmedButNoUsableImageSample: confirmedButNoUsableImage.slice(0, 10).map((c) => ({
      id: c.product.id,
      brand: c.product.brand,
      productName: c.product.productName,
      imageLevel: c.imageStatus.level,
      missingFacets: c.missingFacets,
      sourceNames: c.sourceNames,
    })),
  })
}
