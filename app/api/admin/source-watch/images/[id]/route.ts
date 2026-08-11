import { NextRequest, NextResponse } from "next/server"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { getProduct, listImageAssets, listSourceLinks, listSources, updateImageAsset, updateProduct } from "@/lib/source-watch/storage"
import { recomputeReadiness } from "@/lib/source-watch/product-recompute"
import { toProductCard } from "@/lib/source-watch/present"
import type { ImageAsset, ImageRightsStatus } from "@/lib/source-watch/types"

const RIGHTS_STATUSES: ImageRightsStatus[] = [
  "approved",
  "permission_received",
  "terms_confirmed",
  "embed_only",
  "review_required",
  "prohibited",
]

/**
 * 画像の権利判定を人間が確定させる唯一の入口(IMAGE FINDERの「採用」/Inspectorの権利編集から呼ぶ)。
 * updateImageAsset自体はstorage.tsに以前から存在したが、どのAPIからも呼ばれておらず、画像は
 * 常にreview_requiredのまま変更する手段が無かった。third_party_mediaをapproved等にしても
 * isImageAutoUsable側で二重にブロックされるため、ここでは種別チェックを行わない。
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body || typeof body.productId !== "string") {
    return NextResponse.json({ error: "productIdが必要です" }, { status: 400 })
  }

  const product = await getProduct(body.productId)
  if (!product) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 })
  if (!product.imageAssetIds.includes(id)) {
    return NextResponse.json({ error: "この商品に紐づく画像ではありません" }, { status: 400 })
  }

  // 画像を更新する前に一覧を読んでおく。更新後に同じファイルを読み直すとVercel BlobのCDN伝播遅延で
  // 古いデータが返ることがあるため、更新後の一覧は再読み込みせずこの配列 + updateImageAssetの戻り値
  // (メモリ上で確定した最新値)をマージして作る。
  const imagesBefore = await listImageAssets(product.imageAssetIds)

  const patch: Partial<ImageAsset> = { checkedAt: new Date().toISOString() }
  if (RIGHTS_STATUSES.includes(body.rightsStatus)) patch.rightsStatus = body.rightsStatus
  if (typeof body.creditText === "string") patch.creditText = body.creditText.trim() || undefined
  if (typeof body.rightsUrl === "string") {
    const trimmed = body.rightsUrl.trim()
    if (trimmed && !isSafeExternalUrl(trimmed)) return NextResponse.json({ error: "rightsUrlが不正です" }, { status: 400 })
    patch.rightsUrl = trimmed || undefined
  }
  if (typeof body.allowedToCrop === "boolean") patch.allowedToCrop = body.allowedToCrop
  if (typeof body.allowedToCache === "boolean") patch.allowedToCache = body.allowedToCache
  if (typeof body.allowedToDownload === "boolean") patch.allowedToDownload = body.allowedToDownload
  if (typeof body.editorialUseOnly === "boolean") patch.editorialUseOnly = body.editorialUseOnly

  const updatedAsset = await updateImageAsset(id, patch)
  if (!updatedAsset) return NextResponse.json({ error: "画像が見つかりません" }, { status: 404 })

  const imagesAfter = imagesBefore.map((a) => (a.id === updatedAsset.id ? updatedAsset : a))
  const readiness = recomputeReadiness(product, imagesAfter)
  const updatedProduct = await updateProduct(product.id, {
    readiness: readiness.readiness,
    readinessScore: readiness.score,
    readinessBreakdown: readiness.breakdown,
    blockReasons: readiness.blockReasons,
  })

  const [sourceLinks, sources] = await Promise.all([listSourceLinks(updatedProduct.sourceLinkIds), listSources()])
  return NextResponse.json(toProductCard(updatedProduct, sourceLinks, imagesAfter, sources))
}
