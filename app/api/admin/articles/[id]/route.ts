import { NextRequest, NextResponse } from "next/server"
import { getArticleById, updateArticle, unpublishArticle, addDrafts, generateId } from "@/lib/storage"
import { sanitizeAffiliateLinks, isSafeExternalUrl } from "@/lib/affiliate"
import { canonicalBrandNames } from "@/lib/brands"
import { siteConfig } from "@/lib/site-config"
import type {
  AffiliateLink,
  Category,
  ColorwayInfo,
  Draft,
  GalleryImage,
  OfficialLink,
  PurchaseChannelInfo,
  RelatedArticleLink,
} from "@/lib/types"

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

function sanitizeRelatedArticles(input: unknown): RelatedArticleLink[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
    .map((l) => ({
      title: typeof l.title === "string" ? l.title.trim() : "",
      slug: typeof l.slug === "string" ? l.slug.trim() : "",
      ...(typeof l.note === "string" && l.note.trim() ? { note: l.note.trim() } : {}),
    }))
    .filter((l) => l.title && l.slug)
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = await getArticleById(id)
  if (!article) return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 })
  return NextResponse.json(article)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await getArticleById(id)
  if (!existing) return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })

  const title: string = typeof body.title === "string" ? body.title.trim() : existing.title
  const excerpt: string = typeof body.excerpt === "string" ? body.excerpt.trim() : existing.excerpt
  const bodyParagraphs: string[] = Array.isArray(body.bodyParagraphs)
    ? body.bodyParagraphs.filter((p: unknown): p is string => typeof p === "string" && p.trim().length > 0)
    : existing.bodyParagraphs
  const category: Category = siteConfig.categories.some((c) => c.slug === body.category)
    ? (body.category as Category)
    : existing.category
  const brands: string[] = canonicalBrandNames(
    Array.isArray(body.brands) ? body.brands.filter((b: unknown) => typeof b === "string") : existing.brands
  )
  const tags: string[] = Array.isArray(body.tags)
    ? body.tags.filter((t: unknown) => typeof t === "string")
    : existing.tags
  const coverImage: string = typeof body.coverImage === "string" ? body.coverImage.trim() : existing.coverImage
  const coverImageAlt: string =
    typeof body.coverImageAlt === "string" && body.coverImageAlt.trim() ? body.coverImageAlt.trim() : title
  const featured: boolean = typeof body.featured === "boolean" ? body.featured : existing.featured
  const galleryImages: GalleryImage[] = body.galleryImages ? sanitizeGalleryImages(body.galleryImages) : existing.galleryImages
  const officialLinks: OfficialLink[] = body.officialLinks
    ? sanitizeOfficialLinks(body.officialLinks)
    : existing.officialLinks
  const affiliateLinks: AffiliateLink[] = body.affiliateLinks
    ? sanitizeAffiliateLinks(body.affiliateLinks as AffiliateLink[])
    : existing.affiliateLinks
  const colorways: ColorwayInfo[] = body.colorways ? sanitizeColorways(body.colorways) : existing.colorways ?? []
  const purchaseChannels: PurchaseChannelInfo[] = body.purchaseChannels
    ? sanitizePurchaseChannels(body.purchaseChannels)
    : existing.purchaseChannels ?? []
  const relatedArticles: RelatedArticleLink[] = body.relatedArticles
    ? sanitizeRelatedArticles(body.relatedArticles)
    : existing.relatedArticles ?? []

  if (!title || !excerpt || bodyParagraphs.length === 0) {
    return NextResponse.json({ error: "title/excerpt/bodyParagraphsは必須です" }, { status: 400 })
  }
  if (!coverImage || !isAllowedImageUrl(coverImage)) {
    return NextResponse.json({ error: "coverImageが未設定か不正です" }, { status: 400 })
  }

  const updated = await updateArticle(id, {
    title,
    excerpt,
    bodyParagraphs,
    category,
    brands,
    tags,
    coverImage,
    coverImageAlt,
    featured,
    galleryImages,
    officialLinks,
    affiliateLinks,
    colorways,
    purchaseChannels,
    relatedArticles,
  })

  return NextResponse.json({ ok: true, slug: updated.slug })
}

/**
 * 公開済み記事を非公開にする。ハードデリートはせず、rejected状態のDraftとして
 * drafts.jsonに残す(公開URLからは消えるが内容は失われない、既存の「一度不備がある記事は
 * 削除」運用と同じreversibleな扱い)。
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await getArticleById(id)
  if (!existing) return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 })

  const removed = await unpublishArticle(id)

  const draft: Draft = {
    id: generateId(`${removed.id}-unpublished-${Date.now()}`),
    status: "rejected",
    title: removed.title,
    excerpt: removed.excerpt,
    bodyParagraphs: removed.bodyParagraphs,
    category: removed.category,
    brands: removed.brands,
    tags: removed.tags,
    suggestedAffiliateSearch: [],
    sourceRefs: removed.sourceRefs,
    createdAt: new Date().toISOString(),
  }
  await addDrafts([draft])

  return NextResponse.json({ ok: true })
}
