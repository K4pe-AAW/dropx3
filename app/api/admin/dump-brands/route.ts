import { NextResponse } from "next/server"
import { getAllArticles, getAllBrands } from "@/lib/storage"

/** 一時エンドポイント: 記事化のため承諾リストアップに使うブランド一覧を全件ダンプする。用済み後に削除する。 */
export async function GET() {
  const [brands, articles] = await Promise.all([getAllBrands(), getAllArticles()])

  const detail = brands.map((b) => {
    const related = articles.filter((a) => a.brands.some((x) => x.toLowerCase() === b.name.toLowerCase()))
    return {
      name: b.name,
      count: b.count,
      categories: [...new Set(related.map((a) => a.category))],
      articleTitles: related.map((a) => a.title),
    }
  })

  return NextResponse.json({ totalBrands: brands.length, totalArticles: articles.length, brands: detail })
}
