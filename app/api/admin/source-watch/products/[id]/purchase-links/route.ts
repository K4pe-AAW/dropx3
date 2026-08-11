import { NextRequest, NextResponse } from "next/server"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { getProduct, listImageAssets, listSourceLinks, listSources, updateProduct } from "@/lib/source-watch/storage"
import { makeCandidate } from "@/lib/source-watch/purchase-links"
import { recomputeReadiness } from "@/lib/source-watch/product-recompute"
import { toProductCard } from "@/lib/source-watch/present"
import type { PurchaseLinkKind } from "@/lib/source-watch/types"

const KINDS: PurchaseLinkKind[] = ["official_product", "official_lottery", "domestic_retailer", "domestic_ec", "search", "brand_top"]

/** Inspectorの「購入リンクを探す」。見つけた購入ページのURLを人間が貼り付けて候補に追加する */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 })

  const body = await req.json().catch(() => null)
  const url = typeof body?.url === "string" ? body.url.trim() : ""
  if (!url || !isSafeExternalUrl(url)) return NextResponse.json({ error: "有効なURLを入力してください" }, { status: 400 })
  const kind: PurchaseLinkKind = KINDS.includes(body?.kind) ? body.kind : "domestic_retailer"

  const candidate = makeCandidate(url, kind, typeof body?.label === "string" && body.label.trim() ? body.label.trim() : undefined)
  if (product.purchaseLinkCandidates.some((c) => c.url === candidate.url)) {
    return NextResponse.json({ error: "同じURLの購入リンクが既に登録されています" }, { status: 400 })
  }
  const purchaseLinkCandidates = [...product.purchaseLinkCandidates, candidate]

  const images = await listImageAssets(product.imageAssetIds)
  const readiness = recomputeReadiness(product, images, { purchaseLinkCandidates })
  const updatedProduct = await updateProduct(id, {
    purchaseLinkCandidates,
    readiness: readiness.readiness,
    readinessScore: readiness.score,
    readinessBreakdown: readiness.breakdown,
    blockReasons: readiness.blockReasons,
  })

  const [sourceLinks, sources] = await Promise.all([listSourceLinks(updatedProduct.sourceLinkIds), listSources()])
  return NextResponse.json(toProductCard(updatedProduct, sourceLinks, images, sources))
}
