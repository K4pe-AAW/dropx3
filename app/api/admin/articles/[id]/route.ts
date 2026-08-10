import { NextRequest, NextResponse } from "next/server"
import { getArticleById, updateArticle } from "@/lib/storage"
import { sanitizeAffiliateLinks, isSafeExternalUrl } from "@/lib/affiliate"
import { canonicalBrandNames } from "@/lib/brands"
import { siteConfig } from "@/lib/site-config"
import type { AffiliateLink, Category, ColorwayInfo, GalleryImage, OfficialLink } from "@/lib/types"

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
  })

  return NextResponse.json({ ok: true, slug: updated.slug })
}
