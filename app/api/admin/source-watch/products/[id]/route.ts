import { NextRequest, NextResponse } from "next/server"
import { getProduct } from "@/lib/source-watch/storage"
import { toProductCard } from "@/lib/source-watch/present"
import { listImageAssets, listSourceLinks, listSources } from "@/lib/source-watch/storage"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 })

  const [sourceLinks, imageAssets, sources] = await Promise.all([
    listSourceLinks(product.sourceLinkIds),
    listImageAssets(product.imageAssetIds),
    listSources(),
  ])
  return NextResponse.json(toProductCard(product, sourceLinks, imageAssets, sources))
}
