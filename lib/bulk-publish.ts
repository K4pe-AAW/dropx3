import { QUICK_AFFILIATE_RETAILERS } from "./affiliate"
import { canonicalBrandNames } from "./brands"
import { inferContentType } from "./content-type"
import { generateId, generateSlug } from "./storage"
import type { AffiliateLink, Article, Draft } from "./types"

/** AI提案の検索語から、提携済み店舗の実在する検索リンクだけを組み立てる。 */
export function buildAutoAffiliateLinks(queries: string[]): AffiliateLink[] {
  const query = queries[0]?.trim()
  if (!query) return []
  const links: AffiliateLink[] = []
  for (const item of QUICK_AFFILIATE_RETAILERS) {
    if (!item.build) continue
    try {
      links.push(item.build(query))
    } catch {
      // 設定不足や一般的すぎる検索語の場合は、その店舗だけ追加しない。
    }
  }
  return links
}

/**
 * 下書きIDから常に同じ記事IDを作る。一括公開の応答が途切れて再実行されても、
 * 同じ下書きの記事が重複生成されないようにする。
 */
export function bulkArticleId(draftId: string): string {
  return generateId(`${draftId}-bulk-publish`)
}

export function draftToBulkArticleShape(draft: Draft): Omit<Article, "publishedAt"> {
  const id = bulkArticleId(draft.id)
  const affiliateLinks = buildAutoAffiliateLinks(draft.suggestedAffiliateSearch)
  return {
    id,
    slug: generateSlug(draft.title, id),
    title: draft.title,
    excerpt: draft.excerpt,
    bodyParagraphs: draft.bodyParagraphs,
    coverImage: draft.suggestedCoverImage!,
    coverImageAlt: draft.title,
    galleryImages: draft.suggestedGalleryImages ?? [],
    category: draft.category,
    contentType: draft.contentType ?? inferContentType(draft.category, affiliateLinks.length > 0),
    brands: canonicalBrandNames(draft.brands),
    tags: draft.tags,
    featured: false,
    ...(draft.informationStatus ? { informationStatus: draft.informationStatus } : {}),
    ...(draft.editorialAuthor ? { editorialAuthor: draft.editorialAuthor } : {}),
    ...(draft.seriesName ? { seriesName: draft.seriesName } : {}),
    ...(draft.isSponsored !== undefined ? { isSponsored: draft.isSponsored } : {}),
    ...(draft.suggestedYoutubeVideoId ? { youtubeVideoId: draft.suggestedYoutubeVideoId } : {}),
    ...(draft.suggestedColorways?.length ? { colorways: draft.suggestedColorways } : {}),
    ...(draft.suggestedPurchaseChannels?.length ? { purchaseChannels: draft.suggestedPurchaseChannels } : {}),
    affiliateLinks,
    officialLinks: draft.suggestedOfficialLinks ?? [],
    sourceRefs: draft.sourceRefs,
  }
}
