import { NextRequest, NextResponse } from "next/server"
import { getDraftById, removeDraft, mutateDrafts } from "@/lib/storage"
import {
  sanitizeColorways,
  sanitizeGalleryImages,
  sanitizeOfficialLinks,
  sanitizePurchaseChannels,
  sanitizeSourceRefs,
} from "@/lib/draft-publish"
import { siteConfig } from "@/lib/site-config"
import type { Draft } from "@/lib/types"

/** DraftReviewPendingのポーリング用。生成直後の伝播遅延で見つからない下書きを見つかるまで軽く問い合わせる */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const draft = await getDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "下書きが見つかりません" }, { status: 404 })
  }
  return NextResponse.json({ draft })
}

/**
 * 下書きレビュー画面の「下書きを保存」用。公開はせず、フォームの編集内容をそのまま下書きへ
 * 書き戻す(suggestedXxxフィールドへ)。対象が(生成直後のBlob伝播遅延で)まだ見つからない場合も、
 * publish等と同じ理由でエラーにせず、bodyの内容から新規行として書き込む(id基準のupsert)。
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const result = await mutateDrafts((data) => {
    const idx = data.drafts.findIndex((d) => d.id === id)
    const base: Draft =
      idx >= 0
        ? data.drafts[idx]
        : {
            id,
            status: "pending",
            title: "",
            excerpt: "",
            bodyParagraphs: [],
            category: "sneaker",
            brands: [],
            tags: [],
            suggestedAffiliateSearch: [],
            sourceRefs: [],
            createdAt: new Date().toISOString(),
          }

    const updated: Draft = {
      ...base,
      ...(typeof body.title === "string" && body.title.trim() ? { title: body.title } : {}),
      ...(typeof body.excerpt === "string" ? { excerpt: body.excerpt } : {}),
      ...(Array.isArray(body.bodyParagraphs)
        ? { bodyParagraphs: body.bodyParagraphs.filter((p: unknown): p is string => typeof p === "string" && p.trim().length > 0) }
        : {}),
      ...(typeof body.category === "string" && siteConfig.categories.some((c) => c.slug === body.category)
        ? { category: body.category }
        : {}),
      ...(Array.isArray(body.brands)
        ? { brands: body.brands.filter((b: unknown): b is string => typeof b === "string") }
        : {}),
      ...(Array.isArray(body.tags) ? { tags: body.tags.filter((t: unknown): t is string => typeof t === "string") } : {}),
      ...(typeof body.coverImage === "string"
        ? { suggestedCoverImage: body.coverImage.trim() || undefined }
        : {}),
      ...(typeof body.youtubeVideoId === "string"
        ? { suggestedYoutubeVideoId: body.youtubeVideoId.trim() || undefined }
        : {}),
      ...(Array.isArray(body.galleryImages) ? { suggestedGalleryImages: sanitizeGalleryImages(body.galleryImages) } : {}),
      ...(Array.isArray(body.officialLinks) ? { suggestedOfficialLinks: sanitizeOfficialLinks(body.officialLinks) } : {}),
      ...(Array.isArray(body.colorways) ? { suggestedColorways: sanitizeColorways(body.colorways) } : {}),
      ...(Array.isArray(body.purchaseChannels)
        ? { suggestedPurchaseChannels: sanitizePurchaseChannels(body.purchaseChannels) }
        : {}),
      ...(Array.isArray(body.sourceRefs) ? { sourceRefs: sanitizeSourceRefs(body.sourceRefs) } : {}),
    }

    if (idx >= 0) data.drafts[idx] = updated
    else data.drafts.unshift(updated)
    return data
  })

  const updated = result.drafts.find((d) => d.id === id)
  return NextResponse.json({ ok: true, draft: updated })
}

/**
 * 却下も公開/予約と同じ理由(draft-publish.ts参照)で、直前にgetDraftByIdが見つけられなくても
 * ブロックしない。removeDraftはfilterするだけなので対象が既に存在しなくても安全(冪等)。
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await removeDraft(id)
  return NextResponse.json({ ok: true })
}
