import { NextResponse } from "next/server"
import { dedupeDraftsAgainstArticles } from "@/lib/dedupe-drafts"

export const dynamic = "force-dynamic"

/** 既存の重複データを今すぐ1回だけ掃除する一時API(恒久的にはcron版を使う) */
export async function GET() {
  const summary = await dedupeDraftsAgainstArticles()
  return NextResponse.json(summary)
}
