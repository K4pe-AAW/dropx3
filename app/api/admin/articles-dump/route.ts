import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

/** 一時admin API(読み取り専用)。公式リンク後付け用に記事一覧(id/title/公開日)を返す。使用後削除。 */
export async function GET() {
  const articles = await getAllArticles()
  return NextResponse.json(
    articles.map((a) => ({ id: a.id, title: a.title, publishedAt: a.publishedAt, officialLinksCount: a.officialLinks.length }))
  )
}
