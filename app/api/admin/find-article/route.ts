import { NextRequest, NextResponse } from "next/server"
import { readArticles } from "@/lib/storage"

export async function GET(req: NextRequest) {
  const slugPart = req.nextUrl.searchParams.get("slug") ?? ""
  const { articles } = await readArticles()
  const match = articles.find((a) => a.slug.includes(slugPart))
  return NextResponse.json(match ? { id: match.id, slug: match.slug } : { error: "not found" })
}
