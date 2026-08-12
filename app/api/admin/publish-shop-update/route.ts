import { NextRequest, NextResponse } from "next/server"
import { publishShopUpdate, sanitizeGalleryImages, SHOP_INFO } from "@/lib/shop-update"

/**
 * 画像使用許諾済みの古着屋(tonari/ROOM)のInstagram投稿を1記事として公開するJSON body版API。
 * coverImage/galleryImagesは`/images/xxx.jpg`(git経由でpublicに配置済み)か外部httpsURLを渡す。
 * 実際の公開ロジックはlib/shop-update.tsに共通化されている
 * (app/api/admin/vintage-shop/publishが画像アップロード込みで同じロジックを呼ぶ)。
 * app/api/drafts/[id]/publish と違い下書きを経由せず直接記事化する(下書き一覧を汚さないため)。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })

  if (!SHOP_INFO[body.shop]) {
    return NextResponse.json({ error: `shop must be one of: ${Object.keys(SHOP_INFO).join(", ")}` }, { status: 400 })
  }

  const result = await publishShopUpdate({
    shop: body.shop,
    title: typeof body.title === "string" ? body.title.trim() : "",
    excerpt: typeof body.excerpt === "string" ? body.excerpt.trim() : "",
    bodyParagraphs: Array.isArray(body.bodyParagraphs)
      ? body.bodyParagraphs.filter((p: unknown): p is string => typeof p === "string" && p.trim().length > 0)
      : [],
    coverImage: typeof body.coverImage === "string" ? body.coverImage.trim() : "",
    coverImageAlt: typeof body.coverImageAlt === "string" && body.coverImageAlt.trim() ? body.coverImageAlt : body.title,
    galleryImages: sanitizeGalleryImages(body.galleryImages),
    postUrl: typeof body.postUrl === "string" ? body.postUrl.trim() : "",
    tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : ["古着"],
    extraBrands: Array.isArray(body.extraBrands) ? body.extraBrands.filter((b: unknown) => typeof b === "string") : [],
    mercariSearchQuery: typeof body.mercariSearchQuery === "string" ? body.mercariSearchQuery.trim() : "",
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error, existingSlug: result.existingSlug }, { status: result.status })
  }
  return NextResponse.json(result)
}
