import { NextRequest, NextResponse } from "next/server"
import { getDraftById, mutateDrafts } from "@/lib/storage"
import { buildArticleFromDraft } from "@/lib/draft-publish"

export const dynamic = "force-dynamic"

/** 一時診断API。公開時の「下書きが見つかりません」不具合修正の実データ検証用。確認後に削除する。 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const action = req.nextUrl.searchParams.get("action")

  if (action === "insert") {
    const id = `race-test-${Date.now()}`
    await mutateDrafts((data) => {
      data.drafts.unshift({
        id,
        status: "pending",
        title: "【race-test】一時テスト下書き",
        excerpt: "",
        bodyParagraphs: ["テスト本文"],
        category: "sneaker",
        brands: [],
        tags: [],
        suggestedAffiliateSearch: [],
        sourceRefs: [{ name: "race-test", url: `https://example.com/${id}` }],
        createdAt: new Date().toISOString(),
      })
      return data
    })
    return NextResponse.json({ id })
  }

  if (action === "check-build") {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id必須" }, { status: 400 })

    const draft = await getDraftById(id)
    const fullBody = {
      title: "PublishFormが送るタイトル",
      excerpt: "PublishFormが送る要約",
      bodyParagraphs: ["PublishFormが送る本文段落1"],
      category: "sneaker",
      brands: ["TESTBRAND"],
      tags: ["テスト"],
      coverImage: "https://example.com/cover.jpg",
      coverImageAlt: "カバー画像",
      affiliateLinks: [],
      galleryImages: [],
      officialLinks: [],
      colorways: [],
      purchaseChannels: [],
      sourceRefs: [{ name: "race-test", url: `https://example.com/${id}` }],
    }
    const result = buildArticleFromDraft(draft, id, fullBody)
    return NextResponse.json({ draftFoundByFreshRead: Boolean(draft), buildResult: result })
  }

  if (action === "cleanup") {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id必須" }, { status: 400 })
    await mutateDrafts((data) => {
      data.drafts = data.drafts.filter((d) => d.id !== id)
      return data
    })
    return NextResponse.json({ cleaned: true })
  }

  return NextResponse.json({ error: "action必須" }, { status: 400 })
}
