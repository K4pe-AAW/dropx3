import { NextRequest, NextResponse } from "next/server"
import { readDrafts, mutateDrafts, mutateArticles, mutateScheduledArticles, generateSlug, generateId } from "@/lib/storage"
import { QUICK_AFFILIATE_RETAILERS } from "@/lib/affiliate"
import { canonicalBrandNames } from "@/lib/brands"
import { computeNextSlot } from "@/lib/publish-schedule"
import type { Article, AffiliateLink, Draft, ScheduledArticle } from "@/lib/types"
import { inferContentType } from "@/lib/content-type"

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
  const affiliateLinks = buildAutoAffiliateLinks(draft.suggestedAffiliateSearch)
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
    contentType: inferContentType(draft.category, affiliateLinks.length > 0),
    brands: canonicalBrandNames(draft.brands),
    tags: draft.tags,
    featured: false,
    ...(draft.suggestedYoutubeVideoId ? { youtubeVideoId: draft.suggestedYoutubeVideoId } : {}),
    ...(draft.suggestedColorways && draft.suggestedColorways.length > 0 ? { colorways: draft.suggestedColorways } : {}),
    ...(draft.suggestedPurchaseChannels && draft.suggestedPurchaseChannels.length > 0
      ? { purchaseChannels: draft.suggestedPurchaseChannels }
      : {}),
    affiliateLinks,
    officialLinks: draft.suggestedOfficialLinks ?? [],
    sourceRefs: draft.sourceRefs,
  }
}

/**
 * チェックした下書きを単一トランザクションでまとめて公開(または予約)する。
 * カバー画像が無い下書き(Youtube以外のほとんどの下書きが該当)は、画像未確認のまま公開しない
 * という既存方針を守るため対象外にし、スキップ件数として返す。
 *
 * autoSchedule:trueの場合、全件に同じ日時を付けるのではなく、8-22時(JST)・2時間おき・1枠2件の
 * 固定ペースで、選択順に「次に空いている枠」を1件ずつ割り当てていく(computeNextSlotを都度呼び、
 * 割り当て済みの枠を次の計算に含めることで同一枠への3件目以降の割当を防ぐ)。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((i: unknown): i is string => typeof i === "string") : []
  if (ids.length === 0) {
    return NextResponse.json({ error: "対象が指定されていません" }, { status: 400 })
  }

  const autoSchedule = Boolean(body.autoSchedule)

  const scheduledPublishAtInput = typeof body.scheduledPublishAt === "string" ? body.scheduledPublishAt : ""
  let scheduledIso: string | null = null
  if (!autoSchedule && scheduledPublishAtInput) {
    const d = new Date(scheduledPublishAtInput)
    if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
      return NextResponse.json({ error: "公開日時は未来の時刻を指定してください" }, { status: 400 })
    }
    scheduledIso = d.toISOString()
  }

  const { drafts } = await readDrafts()
  const targets = drafts.filter((d) => ids.includes(d.id))

  // SNAPは人物情報と掲載同意の個別確認が必要なため、一括公開の対象にしない。
  const ready = targets.filter((d) => Boolean(d.suggestedCoverImage) && d.contentType !== "SNAP")
  const skipped = targets.filter((d) => !d.suggestedCoverImage || d.contentType === "SNAP")

  if (ready.length > 0) {
    if (autoSchedule) {
      // scheduledData.scheduledへのpushだけを次のcomputeNextSlot呼び出しの入力にする(既に
      // 割り当てた分を別配列でも二重に数えると、1枠2件のはずが1件ごとに次枠へ進んでしまうため)。
      // mutateScheduledArticlesで包むことで、他の予約リクエストと競合してもETagで安全にやり直す
      await mutateScheduledArticles((scheduledData) => {
        for (const draft of ready) {
          const slot = computeNextSlot(scheduledData.scheduled.map((s) => s.scheduledPublishAt))
          const iso = slot.toISOString()
          const article = draftToArticleShape(draft)
          const scheduled: ScheduledArticle = { ...article, scheduledPublishAt: iso }
          scheduledData.scheduled = scheduledData.scheduled.filter((s) => s.id !== scheduled.id)
          scheduledData.scheduled.push(scheduled)
        }
        return scheduledData
      })
    } else if (scheduledIso) {
      await mutateScheduledArticles((scheduledData) => {
        for (const draft of ready) {
          const article = draftToArticleShape(draft)
          const scheduled: ScheduledArticle = { ...article, scheduledPublishAt: scheduledIso }
          scheduledData.scheduled = scheduledData.scheduled.filter((s) => s.id !== scheduled.id)
          scheduledData.scheduled.push(scheduled)
        }
        return scheduledData
      })
    } else {
      const now = new Date().toISOString()
      await mutateArticles((articlesData) => {
        for (const draft of ready) {
          const article: Article = { ...draftToArticleShape(draft), publishedAt: now }
          articlesData.articles.unshift(article)
        }
        articlesData.lastUpdated = now
        return articlesData
      })
    }

    await mutateDrafts((data) => {
      data.drafts = data.drafts.filter((d) => !ready.some((r) => r.id === d.id))
      return data
    })
  }

  return NextResponse.json({
    ok: true,
    published: ready.length,
    scheduled: autoSchedule || Boolean(scheduledIso),
    skipped: skipped.length,
    skippedTitles: skipped.map((d) => d.title),
  })
}
