import { NextRequest, NextResponse } from "next/server"
import { listSources, seedSourcesIfMissing, getLatestCrawlLog, addSource } from "@/lib/source-watch/storage"
import { INITIAL_SOURCES } from "@/lib/source-watch/seed-sources"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { generateId } from "@/lib/storage"
import { resolveYoutubeChannelId, youtubeChannelRssUrl } from "@/lib/source-watch/youtube"
import { DEFAULT_SOURCE_SCORE_BY_CATEGORY } from "@/lib/source-watch/types"
import type { ProductCategory, Source } from "@/lib/source-watch/types"

const PRODUCT_CATEGORIES: ProductCategory[] = ["apparel", "shoes", "vintage_insta", "accessories", "furniture"]

export async function GET() {
  try {
    await seedSourcesIfMissing(INITIAL_SOURCES)
  } catch {
    // ビルド時の静的解析パス等、書き込みができないタイミングで呼ばれた場合はスキップする(次回実リクエストで再試行)
  }
  const sources = await listSources()
  const withLogs = await Promise.all(
    sources.map(async (s) => ({ ...s, latestCrawlLog: await getLatestCrawlLog(s.id) }))
  )
  return NextResponse.json({ sources: withLogs })
}

type AddKind = "official" | "retailer" | "youtube"
const ADD_KINDS: AddKind[] = ["official", "retailer", "youtube"]

/**
 * 管理画面の「情報源を追加」。ブランド公式サイト/セレクトショップ/YouTubeチャンネルの3種類を
 * 1フォーム・1リクエストで登録できるようにする(Instagram追加フォームと同じ考え方)。
 * YouTubeはチャンネルIDを自動解決してRSS登録まで済ませる(html/manualに落とさず自動巡回対象にする)。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })

  const kind: AddKind = ADD_KINDS.includes(body.kind) ? body.kind : "official"
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const inputUrl = typeof body.url === "string" ? body.url.trim() : ""
  const brands: string[] = Array.isArray(body.brands) ? body.brands.filter((b: unknown) => typeof b === "string" && b.trim()) : []
  const productCategory: ProductCategory | undefined = PRODUCT_CATEGORIES.includes(body.productCategory) ? body.productCategory : undefined

  if (!name) return NextResponse.json({ error: "名前を入力してください" }, { status: 400 })
  if (!inputUrl || !isSafeExternalUrl(inputUrl)) return NextResponse.json({ error: "有効なURLを入力してください" }, { status: 400 })

  const now = new Date().toISOString()

  if (kind === "youtube") {
    const channelId = await resolveYoutubeChannelId(inputUrl)
    if (!channelId) {
      return NextResponse.json(
        { error: "チャンネルIDを取得できませんでした。チャンネルのトップページURL(/channel/UC…または/@ハンドル)を確認してください" },
        { status: 422 }
      )
    }
    const id = `youtube-${channelId}`
    const source: Source = {
      id,
      name,
      url: inputUrl,
      feedUrl: youtubeChannelRssUrl(channelId),
      category: "domestic_media",
      productCategory,
      sourceScore: DEFAULT_SOURCE_SCORE_BY_CATEGORY.domestic_media,
      brands: brands.length > 0 ? brands : undefined,
      monitoringMethod: "rss",
      monitoringIntervalMinutes: 720,
      enabled: true,
      imagePolicy: "embed_only",
      platform: "youtube",
      handle: channelId,
      createdAt: now,
      updatedAt: now,
    }
    try {
      const created = await addSource(source)
      return NextResponse.json(created)
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "追加に失敗しました(既に登録済みの可能性があります)" }, { status: 409 })
    }
  }

  const category = kind === "retailer" ? "retailer" : "official"
  const id = `${category}-${generateId(inputUrl).slice(0, 16)}`
  const source: Source = {
    id,
    name,
    url: inputUrl,
    category,
    productCategory,
    sourceScore: DEFAULT_SOURCE_SCORE_BY_CATEGORY[category],
    brands: brands.length > 0 ? brands : undefined,
    // サイトごとにRSS/Sitemapの有無がまちまちなので、安全側(html)で登録しておき
    // 巡回方式は情報源管理画面で個別に調整してもらう(SourceRowの既存編集UIで対応可能)
    monitoringMethod: "html",
    monitoringIntervalMinutes: 720,
    enabled: true,
    imagePolicy: "unknown",
    createdAt: now,
    updatedAt: now,
  }
  try {
    const created = await addSource(source)
    return NextResponse.json(created)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "追加に失敗しました(既に登録済みの可能性があります)" }, { status: 409 })
  }
}
