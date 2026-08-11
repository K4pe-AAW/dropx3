import { NextRequest, NextResponse } from "next/server"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { addImageAsset, getProduct, listImageAssets, updateProduct } from "@/lib/source-watch/storage"
import { defaultRightsStatusFor } from "@/lib/source-watch/image-rights"
import { recomputeReadiness } from "@/lib/source-watch/product-recompute"
import { IMAGE_SOURCE_TYPES } from "@/lib/source-watch/labels"
import type { ImageSourceType } from "@/lib/source-watch/types"

/**
 * IMAGE FINDERの「画像URLを追加」。クロールで見つからなかった画像を人間が手動で候補登録する。
 * rightsStatusは種別ごとの既定値(defaultRightsStatusFor)から始まり、必ずreview_required以上には
 * ならない(third_party_mediaは常にreview_required — image-rights.ts参照)。承認は別途PATCH /images/[id]で行う。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 })

  const body = await req.json().catch(() => null)
  const url = typeof body?.url === "string" ? body.url.trim() : ""
  if (!url || !isSafeExternalUrl(url)) return NextResponse.json({ error: "有効な画像URLを入力してください" }, { status: 400 })

  const sourceType: ImageSourceType = IMAGE_SOURCE_TYPES.includes(body?.sourceType) ? body.sourceType : "affiliate_asset"
  const sourceUrl = typeof body?.sourceUrl === "string" && isSafeExternalUrl(body.sourceUrl.trim()) ? body.sourceUrl.trim() : url

  const asset = await addImageAsset({
    productId: product.id,
    url,
    sourceUrl,
    sourceType,
    rightsStatus: defaultRightsStatusFor(sourceType),
    checkedAt: new Date().toISOString(),
  })

  const imageAssetIds = [...new Set([...product.imageAssetIds, asset.id])]
  const allImages = await listImageAssets(imageAssetIds)
  const readiness = recomputeReadiness(product, allImages)
  const updatedProduct = await updateProduct(id, {
    imageAssetIds,
    readiness: readiness.readiness,
    readinessScore: readiness.score,
    readinessBreakdown: readiness.breakdown,
    blockReasons: readiness.blockReasons,
  })

  return NextResponse.json({ ok: true, image: asset, product: updatedProduct })
}
