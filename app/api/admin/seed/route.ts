import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { writeArticles, writeDrafts } from "@/lib/storage"
import type { ArticlesData, DraftsData } from "@/lib/types"

/**
 * 一時的な移行用エンドポイント。デプロイバンドルに含まれるdata/articles.json・data/drafts.json
 * (git管理下の初期シードデータ)をVercel Blobへ書き込む。ローカルではBLOB_READ_WRITE_TOKENが
 * 手元になくても、本番環境には既にあるためこの経路でBlobへ投入する。1回使ったら削除する想定。
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-password")
  if (!process.env.ADMIN_PASSWORD || secret !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const articles: ArticlesData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "articles.json"), "utf-8")
  )
  const drafts: DraftsData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "drafts.json"), "utf-8")
  )

  await writeArticles(articles)
  await writeDrafts(drafts)

  return NextResponse.json({
    ok: true,
    articles: articles.articles.length,
    drafts: drafts.drafts.length,
  })
}
