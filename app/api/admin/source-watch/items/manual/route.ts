import { NextRequest, NextResponse } from "next/server"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { getSource, findSourceItemByUrl, createSourceItem } from "@/lib/source-watch/storage"
import { processSourceItem, buildExistingArticleSignature } from "@/lib/source-watch/crawl"

/**
 * monitoringMethod:"manual"のソース(Instagram/StockX等、自動取得が未実装のもの)向けに、
 * 管理画面からURLを手動で1件登録しSourceItemパイプラインへ乗せる。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })

  const sourceId = String(body.sourceId ?? "")
  const url = String(body.url ?? "").trim()
  const title = String(body.title ?? "").trim()

  if (!sourceId || !url) return NextResponse.json({ error: "sourceId/urlは必須です" }, { status: 400 })
  if (!isSafeExternalUrl(url)) return NextResponse.json({ error: "urlが不正です" }, { status: 400 })

  const source = await getSource(sourceId)
  if (!source) return NextResponse.json({ error: "ソースが見つかりません" }, { status: 404 })

  const existing = await findSourceItemByUrl(url)
  if (existing) return NextResponse.json({ error: "このURLは既に登録済みです", itemId: existing.id }, { status: 409 })

  const item = await createSourceItem({
    sourceId,
    sourceUrl: url,
    title: title || url,
    detectedAt: new Date().toISOString(),
    rawText: typeof body.rawText === "string" ? body.rawText : undefined,
    processingStatus: "new",
  })

  try {
    const signature = await buildExistingArticleSignature()
    await processSourceItem(source, item, signature)
  } catch (err) {
    return NextResponse.json({
      ok: true,
      item,
      warning: `登録はされましたが解析でエラーが発生しました: ${err instanceof Error ? err.message : String(err)}`,
    })
  }

  return NextResponse.json({ ok: true, item })
}
