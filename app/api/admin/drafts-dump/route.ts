import { NextResponse } from "next/server"
import { getPendingDrafts } from "@/lib/storage"

/** 一時admin API(読み取り専用)。117件の下書き一括レビュー用に軽量ダンプを返す。使用後削除。 */
export async function GET() {
  const drafts = await getPendingDrafts()
  return NextResponse.json(
    drafts.map((d) => ({
      id: d.id,
      title: d.title,
      excerpt: d.excerpt,
      category: d.category,
      brands: d.brands,
      tags: d.tags,
      sourceRefs: d.sourceRefs.map((s) => s.name),
      hasCoverImage: Boolean(d.suggestedCoverImage),
      officialLinksCount: d.suggestedOfficialLinks?.length ?? 0,
      createdAt: d.createdAt,
    }))
  )
}
