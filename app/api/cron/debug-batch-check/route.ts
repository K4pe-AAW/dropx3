import { NextRequest, NextResponse } from "next/server"
import { draftsFromUrls } from "@/lib/url-draft"
import { mutateDrafts } from "@/lib/storage"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/** 一時診断API。複数URL一括生成(draftsFromUrls)の実データ検証用。確認後に削除する。 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const action = req.nextUrl.searchParams.get("action")

  if (action === "cleanup") {
    const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean)
    await mutateDrafts((data) => {
      data.drafts = data.drafts.filter((d) => !ids.includes(d.id))
      return data
    })
    return NextResponse.json({ cleaned: ids.length })
  }

  const urlsParam = req.nextUrl.searchParams.get("urls")
  const urls = urlsParam ? urlsParam.split(",") : []
  if (urls.length === 0) return NextResponse.json({ error: "urls必須" }, { status: 400 })

  const results = await draftsFromUrls(urls)
  return NextResponse.json({
    results: results.map((r) => ({
      url: r.url,
      draftId: r.draft?.id,
      title: r.draft?.title,
      error: r.error,
    })),
  })
}
