import { NextResponse } from "next/server"
import { getAllArticles, getAllBrands } from "@/lib/storage"
import { listSources } from "@/lib/source-watch/storage"

/** 一時エンドポイント: ブランドごとの記事内officialLinksとSOURCE WATCH登録URLを突き合わせる。用済み後に削除する。 */
export async function GET() {
  const [brands, articles, sources] = await Promise.all([getAllBrands(), getAllArticles(), listSources()])

  const detail = brands.map((b) => {
    const related = articles.filter((a) => a.brands.some((x) => x.toLowerCase() === b.name.toLowerCase()))
    const officialLinks = related.flatMap((a) => a.officialLinks.map((l) => ({ label: l.label, url: l.url, articleTitle: a.title })))
    const matchedSources = sources
      .filter((s) => s.name.toLowerCase().includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(s.name.toLowerCase()) || s.brands?.some((sb) => sb.toLowerCase() === b.name.toLowerCase()))
      .map((s) => ({ name: s.name, url: s.url, category: s.category }))
    return { name: b.name, officialLinks, matchedSources }
  })

  return NextResponse.json({ brands: detail })
}
