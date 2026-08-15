import { NextRequest, NextResponse } from "next/server"
import {
  readDrafts,
  writeDrafts,
  readArticles,
  writeArticles,
  readScheduledArticles,
  writeScheduledArticles,
  generateSlug,
  generateId,
} from "@/lib/storage"
import { QUICK_AFFILIATE_RETAILERS } from "@/lib/affiliate"
import { canonicalBrandNames } from "@/lib/brands"
import type { Article, AffiliateLink, Draft, ScheduledArticle } from "@/lib/types"

/** AIが提案した検索キーワードから、自動生成できる店舗の実リンクをまとめて組み立てる(PublishFormの「自動でリンクを追加」と同じロジック) */
function buildAutoAffiliateLinks(queries: string[]): AffiliateLink[] {
  const query = queries[0]?.trim()
  if (!query) return []
  const links: AffiliateLink[] = []
  for (const item of QUICK_AFFILIATE_RETAILERS) {
    if (!item.build) continue
    try {
      links.push(item.build(query))
    } catch {
      // 具体的すぎない/一般的すぎるキーワード等で作れない場合はそのリンクだけ諦める
    }
  }
  return links
}

function draftToArticleShape(draft: Draft): Omit<Article, "publishedAt"> {
  const newId = generateId(`${draft.id}-${Date.now()}`)
  return {
    id: newId,
    slug: generateSlug(draft.title, newId),
    title: draft.title,
    excerpt: draft.excerpt,
    bodyParagraphs: draft.bodyParagraphs,
    coverImage: draft.suggestedCoverImage!,
    coverImageAlt: draft.title,
    galleryImages: draft.suggestedGalleryImages ?? [],
    category: draft.category,
    brands: canonicalBrandNames(draft.brands),
    tags: draft.tags,
    featured: false,
    ...(draft.suggestedYoutubeVideoId ? { youtubeVideoId: draft.suggestedYoutubeVideoId } : {}),
    ...(draft.suggestedColorways && draft.suggestedColorways.length > 0 ? { colorways: draft.suggestedColorways } : {}),
    ...(draft.suggestedPurchaseChannels && draft.suggestedPurchaseChannels.length > 0
      ? { purchaseChannels: draft.suggestedPurchaseChannels }
      : {}),
    affiliateLinks: buildAutoAffiliateLinks(draft.suggestedAffiliateSearch),
    officialLinks: draft.suggestedOfficialLinks ?? [],
    sourceRefs: draft.sourceRefs,
  }
}

/**
 * チェックした下書きを単一トランザクションでまとめて公開(または予約)する。
 * カバー画像が無い下書き(Youtube以外のほとんどの下書きが該当)は、画像未確認のまま公開しない
 * という既存方針を守るため対象外にし、スキップ件数として返す。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((i: unknown): i is string => typeof i === "string") : []
  if (ids.length === 0) {
    return NextResponse.json({ error: "対象が指定されていません" }, { status: 400 })
  }

  const scheduledPublishAtInput = typeof body.scheduledPublishAt === "string" ? body.scheduledPublishAt : ""
  let scheduledIso: string | null = null
  if (scheduledPublishAtInput) {
    const d = new Date(scheduledPublishAtInput)
    if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
      return NextResponse.json({ error: "公開日時は未来の時刻を指定してください" }, { status: 400 })
    }
    scheduledIso = d.toISOString()
  }

  const draftsData = await readDrafts()
  const targets = draftsData.drafts.filter((d) => ids.includes(d.id))

  const ready = targets.filter((d) => Boolean(d.suggestedCoverImage))
  const skipped = targets.filter((d) => !d.suggestedCoverImage)

  if (ready.length > 0) {
    if (scheduledIso) {
      const scheduledData = await readScheduledArticles()
      for (const draft of ready) {
        const article = draftToArticleShape(draft)
        const scheduled: ScheduledArticle = { ...article, scheduledPublishAt: scheduledIso }
        scheduledData.scheduled = scheduledData.scheduled.filter((s) => s.id !== scheduled.id)
        scheduledData.scheduled.push(scheduled)
      }
      await writeScheduledArticles(scheduledData)
    } else {
      const articlesData = await readArticles()
      const now = new Date().toISOString()
      for (const draft of ready) {
        const article: Article = { ...draftToArticleShape(draft), publishedAt: now }
        articlesData.articles.unshift(article)
      }
      articlesData.lastUpdated = now
      await writeArticles(articlesData)
    }

    draftsData.drafts = draftsData.drafts.filter((d) => !ready.some((r) => r.id === d.id))
    await writeDrafts(draftsData)
  }

  return NextResponse.json({
    ok: true,
    published: ready.length,
    scheduled: Boolean(scheduledIso),
    skipped: skipped.length,
    skippedTitles: skipped.map((d) => d.title),
  })
}
