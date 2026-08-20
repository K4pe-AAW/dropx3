import { NextRequest, NextResponse } from "next/server"
import { getVintageDraftById, removeVintageDraft } from "@/lib/vintage-drafts"
import { publishShopUpdate } from "@/lib/shop-update"

/** 保存済みの下書きをそのまま公開する(画像は下書き保存時に既にBlobへアップロード済みのURLを使う) */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const draft = await getVintageDraftById(id)
  if (!draft) return NextResponse.json({ error: "下書きが見つかりません" }, { status: 404 })

  const result = await publishShopUpdate({
    shop: draft.shop,
    title: draft.title,
    excerpt: draft.excerpt,
    bodyParagraphs: draft.bodyParagraphs,
    coverImage: draft.coverImage,
    coverImageAlt: draft.coverImageAlt,
    galleryImages: draft.galleryImages,
    postUrl: draft.postUrl,
    tags: draft.tags,
    extraBrands: [],
    affiliateLinks: draft.affiliateLinks,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error, existingSlug: result.existingSlug }, { status: result.status })
  }

  await removeVintageDraft(id)
  return NextResponse.json(result)
}
