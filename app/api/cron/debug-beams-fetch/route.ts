import { NextRequest, NextResponse } from "next/server"
import { fetchPageText } from "@/lib/source-watch/fetchers/html"

/**
 * 一時診断用。「URLでブラッシュアップ」がBEAMSのURLで「ページの取得に失敗しました」となる件の
 * 原因切り分け(自分のサンドボックスからはbeams.co.jp自体がタイムアウトしたが、Vercel本番の
 * ネットワークからも同じか確認する)。確認後すぐ削除する。
 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url =
    req.nextUrl.searchParams.get("url") ??
    "https://www.beams.co.jp/tag/ltop_260612_ray_PUMA/?ranMID=44010&ranSiteId=GxI05GgsI_I-qG4HJGSK_MsnQPIxCCpjLg&utm_campaign=3558353&utm_source=linkshare&utm_medium=affiliate"

  const startedAt = Date.now()
  let rawFetch: Record<string, unknown>
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DropwireSourceWatch/1.0; +https://dropx3.com)" },
      signal: AbortSignal.timeout(12000),
    })
    rawFetch = {
      ok: res.ok,
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      elapsedMs: Date.now() - startedAt,
    }
  } catch (err) {
    rawFetch = {
      threw: true,
      name: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startedAt,
    }
  }

  const startedAt2 = Date.now()
  const pageResult = await fetchPageText(url)

  return NextResponse.json({
    url,
    rawFetch,
    fetchPageTextResult: pageResult
      ? {
          titleLength: pageResult.title?.length ?? 0,
          textLength: pageResult.text?.length ?? 0,
          imageCandidateCount: pageResult.imageCandidates.length,
        }
      : null,
    fetchPageTextElapsedMs: Date.now() - startedAt2,
  })
}
