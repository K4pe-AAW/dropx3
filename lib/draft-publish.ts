import { generateSlug, generateId } from "@/lib/storage"
import { sanitizeAffiliateLinks, isSafeExternalUrl } from "@/lib/affiliate"
import { canonicalBrandNames } from "@/lib/brands"
import { siteConfig } from "@/lib/site-config"
import type {
  Article,
  AffiliateLink,
  Category,
  ColorwayInfo,
  Draft,
  GalleryImage,
  OfficialLink,
  PurchaseChannelInfo,
} from "@/lib/types"

/** ローカルパス(/images/xxx.jpg)か、http(s)の絶対URLのみ許可する（//host/pathのprotocol-relativeは除外） */
function isAllowedImageUrl(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true
  return isSafeExternalUrl(url)
}

function sanitizeColorways(input: unknown): ColorwayInfo[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => {
      const colorName = typeof c.colorName === "string" ? c.colorName.trim() : ""
      const image = typeof c.image === "string" ? c.image.trim() : ""
      const retailers = Array.isArray(c.retailers)
        ? c.retailers.filter((r): r is string => typeof r === "string" && r.trim().length > 0)
        : undefined
      return {
        colorName,
        ...(image && isAllowedImageUrl(image) ? { image } : {}),
        ...(typeof c.styleCode === "string" && c.styleCode.trim() ? { styleCode: c.styleCode.trim() } : {}),
        ...(typeof c.price === "string" && c.price.trim() ? { price: c.price.trim() } : {}),
        ...(typeof c.size === "string" && c.size.trim() ? { size: c.size.trim() } : {}),
        ...(typeof c.releaseDate === "string" && c.releaseDate.trim() ? { releaseDate: c.releaseDate.trim() } : {}),
        ...(retailers && retailers.length > 0 ? { retailers } : {}),
      }
    })
    .filter((c) => c.colorName)
}

const CHANNEL_TYPES = new Set(["official", "secondary"])
const SALE_METHODS = new Set(["regular", "lottery", "unknown"])

function sanitizePurchaseChannels(input: unknown): PurchaseChannelInfo[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => {
      const retailerName = typeof c.retailerName === "string" ? c.retailerName.trim() : ""
      const url = typeof c.url === "string" ? c.url.trim() : ""
      return {
        retailerName,
        channelType: CHANNEL_TYPES.has(c.channelType as string) ? (c.channelType as PurchaseChannelInfo["channelType"]) : "official",
        saleMethod: SALE_METHODS.has(c.saleMethod as string) ? (c.saleMethod as PurchaseChannelInfo["saleMethod"]) : "unknown",
        ...(typeof c.date === "string" && c.date.trim() ? { date: c.date.trim() } : {}),
        ...(url && isSafeExternalUrl(url) ? { url } : {}),
      }
    })
    .filter((c) => c.retailerName)
}

function sanitizeGalleryImages(input: unknown): GalleryImage[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((img): img is { url?: unknown; alt?: unknown } => typeof img === "object" && img !== null)
    .map((img) => ({
      url: typeof img.url === "string" ? img.url.trim() : "",
      alt: typeof img.alt === "string" ? img.alt : "",
    }))
    .filter((img) => img.url && isAllowedImageUrl(img.url))
}

function sanitizeOfficialLinks(input: unknown): OfficialLink[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((l): l is { label?: unknown; url?: unknown } => typeof l === "object" && l !== null)
    .map((l) => ({
      label: typeof l.label === "string" && l.label.trim() ? l.label.trim() : "公式サイトで見る",
      url: typeof l.url === "string" ? l.url.trim() : "",
    }))
    .filter((l) => l.url && isSafeExternalUrl(l.url))
}

export type BuildArticleResult =
  | { ok: true; article: Omit<Article, "publishedAt"> }
  | { ok: false; error: string; status: number }

/**
 * 下書きレビューのリクエストボディ(PublishForm由来)から、公開直前の状態のArticle(publishedAtを
 * 除く)を組み立てる。/api/drafts/[id]/publish(即時公開)と/api/drafts/[id]/schedule(予約公開)の
 * 両方で共有するバリデーション・サニタイズ本体。
 */
export function buildArticleFromDraft(draft: Draft, body: Record<string, unknown>): BuildArticleResult {
  const title: string = typeof body.title === "string" && body.title.trim() ? body.title : draft.title
  const excerpt: string = typeof body.excerpt === "string" ? body.excerpt : draft.excerpt
  const bodyParagraphs: string[] =
    Array.isArray(body.bodyParagraphs) && body.bodyParagraphs.length > 0
      ? body.bodyParagraphs.filter((p: unknown): p is string => typeof p === "string" && p.trim().length > 0)
      : draft.bodyParagraphs
  const category: Category = siteConfig.categories.some((c) => c.slug === body.category)
    ? (body.category as Category)
    : draft.category
  const brands: string[] = canonicalBrandNames(
    Array.isArray(body.brands) ? body.brands.filter((b: unknown) => typeof b === "string") : draft.brands
  )
  const tags: string[] = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : draft.tags
  const coverImageInput: string = typeof body.coverImage === "string" ? body.coverImage.trim() : ""
  const coverImageAlt: string = typeof body.coverImageAlt === "string" && body.coverImageAlt.trim() ? body.coverImageAlt : title
  const affiliateLinks: AffiliateLink[] = sanitizeAffiliateLinks(
    Array.isArray(body.affiliateLinks) ? (body.affiliateLinks as AffiliateLink[]) : []
  )
  const youtubeVideoIdInput: string = typeof body.youtubeVideoId === "string" ? body.youtubeVideoId.trim() : ""
  const youtubeVideoId = /^[A-Za-z0-9_-]{6,20}$/.test(youtubeVideoIdInput) ? youtubeVideoIdInput : undefined
  const galleryImages: GalleryImage[] = sanitizeGalleryImages(body.galleryImages)
  const officialLinks: OfficialLink[] = sanitizeOfficialLinks(body.officialLinks)
  const colorways: ColorwayInfo[] = sanitizeColorways(body.colorways)
  const purchaseChannels: PurchaseChannelInfo[] = sanitizePurchaseChannels(body.purchaseChannels)

  if (!coverImageInput) {
    return { ok: false, error: "カバー画像URLは必須です", status: 400 }
  }
  if (!isAllowedImageUrl(coverImageInput)) {
    return { ok: false, error: "カバー画像URLが不正です（http(s)の絶対URLかローカルパスのみ）", status: 400 }
  }
  if (bodyParagraphs.length === 0) {
    return { ok: false, error: "本文が空です", status: 400 }
  }

  const newId = generateId(`${draft.id}-${Date.now()}`)
  const article: Omit<Article, "publishedAt"> = {
    id: newId,
    slug: generateSlug(title, newId),
    title,
    excerpt,
    bodyParagraphs,
    coverImage: coverImageInput,
    coverImageAlt,
    galleryImages,
    category,
    brands,
    tags,
    featured: Boolean(body.featured),
    ...(youtubeVideoId ? { youtubeVideoId } : {}),
    ...(colorways.length > 0 ? { colorways } : {}),
    ...(purchaseChannels.length > 0 ? { purchaseChannels } : {}),
    affiliateLinks,
    officialLinks,
    sourceRefs: draft.sourceRefs,
  }

  return { ok: true, article }
}
