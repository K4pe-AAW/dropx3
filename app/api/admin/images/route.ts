import { NextResponse } from "next/server"
import { readArticles } from "@/lib/storage"

// 診断用の一時ツール。使用後に削除する。
export async function GET() {
  const { articles } = await readArticles()
  const list = articles.map((a) => ({ id: a.id, slug: a.slug, coverImage: a.coverImage }))
  return NextResponse.json({ articles: list, count: list.length })
}
