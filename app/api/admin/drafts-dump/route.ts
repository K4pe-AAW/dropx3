import { NextResponse } from "next/server"
import { getPendingDrafts } from "@/lib/storage"

/** 一時admin API(読み取り専用)。画像未設定ドラフトの一括ソーシング用に詳細ダンプを返す。使用後削除。 */
export async function GET() {
  const drafts = await getPendingDrafts()
  return NextResponse.json(
    drafts
      .filter((d) => !d.suggestedCoverImage)
      .map((d) => ({
        id: d.id,
        title: d.title,
        excerpt: d.excerpt,
        category: d.category,
        brands: d.brands,
        suggestedAffiliateSearch: d.suggestedAffiliateSearch,
        sourceRefs: d.sourceRefs,
        createdAt: d.createdAt,
      }))
  )
}
