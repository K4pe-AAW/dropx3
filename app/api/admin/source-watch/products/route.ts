import { NextRequest, NextResponse } from "next/server"
import { listProducts } from "@/lib/source-watch/storage"
import { listProductCards, sortCardsByPriority } from "@/lib/source-watch/present"

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const all = await listProducts()

  let filtered = all.filter((p) => p.reviewStatus !== "ignored")

  const tier = params.get("tier")
  if (tier && ["CONFIRMED", "REPORTED", "RUMOR"].includes(tier)) {
    filtered = filtered.filter((p) => p.tier === tier)
  }
  const hasImage = params.get("hasImage")
  if (hasImage === "true") filtered = filtered.filter((p) => p.imageAssetIds.length > 0)
  if (hasImage === "false") filtered = filtered.filter((p) => p.imageAssetIds.length === 0)

  const rights = params.get("rights")
  if (rights === "approved") filtered = filtered.filter((p) => p.readinessBreakdown.safeImage > 0)
  if (rights === "review_required") {
    filtered = filtered.filter((p) => p.imageAssetIds.length > 0 && p.readinessBreakdown.safeImage === 0)
  }

  const domestic = params.get("domestic")
  if (domestic === "true") filtered = filtered.filter((p) => p.domesticConfirmed)
  if (domestic === "false") filtered = filtered.filter((p) => !p.domesticConfirmed)

  const purchaseLink = params.get("purchaseLink")
  if (purchaseLink === "true") filtered = filtered.filter((p) => p.purchaseLinkCandidates.some((c) => !c.isBrandTopOnly))
  if (purchaseLink === "false") filtered = filtered.filter((p) => !p.purchaseLinkCandidates.some((c) => !c.isBrandTopOnly))

  const brand = params.get("brand")
  if (brand) filtered = filtered.filter((p) => p.brand?.toLowerCase() === brand.toLowerCase())

  const minScore = params.get("minScore")
  if (minScore) filtered = filtered.filter((p) => p.sourceScore >= Number(minScore))

  const cards = sortCardsByPriority(await listProductCards(filtered))
  const sourceFilter = params.get("source")
  const bySource = sourceFilter ? cards.filter((c) => c.sourceNames.includes(sourceFilter)) : cards

  return NextResponse.json({ products: bySource })
}
