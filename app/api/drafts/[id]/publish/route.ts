import { NextRequest, NextResponse } from "next/server"
import { getDraftById, removeDraft, publishArticle, generateSlug, generateId } from "@/lib/storage"
import { sanitizeAffiliateLinks, isSafeExternalUrl } from "@/lib/affiliate"
import { siteConfig } from "@/lib/site-config"
import type { Article, AffiliateLink, Category, GalleryImage, OfficialLink } from "@/lib/types"

/** ローカルパス(/images/xxx.jpg)か、http(s)の絶対URLのみ許可する（//host/pathのprotocol-relativeは除外） */
function isAllowedImageUrl(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true
  return isSafeExternalUrl(url)
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const draft = getDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "下書きが見つかりません" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))

  const title: string = typeof body.title === "string" && body.title.trim() ? body.title : draft.title
  const excerpt: string = typeof body.excerpt === "string" ? body.excerpt : draft.excerpt
  const bodyParagraphs: string[] =
    Array.isArray(body.bodyParagraphs) && body.bodyParagraphs.length > 0
      ? body.bodyParagraphs.filter((p: unknown): p is string => typeof p === "string" && p.trim().length > 0)
      : draft.bodyParagraphs
  const category: Category = siteConfig.categories.some((c) => c.slug === body.category)
    ? (body.category as Category)
    : draft.category
  const brands: string[] = Array.isArray(body.brands) ? body.brands.filter((b: unknown) => typeof b === "string") : draft.brands
  const tags: string[] = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : draft.tags
  const coverImageInput: string = typeof body.coverImage === "string" ? body.coverImage.trim() : ""
  const coverImageAlt: string = typeof body.coverImageAlt === "string" && body.coverImageAlt.trim() ? body.coverImageAlt : title
  const affiliateLinks: AffiliateLink[] = sanitizeAffiliateLinks(
    Array.isArray(body.affiliateLinks) ? (body.affiliateLinks as AffiliateLink[]) : []
  )
  const galleryImages: GalleryImage[] = sanitizeGalleryImages(body.galleryImages)
  const officialLinks: OfficialLink[] = sanitizeOfficialLinks(body.officialLinks)

  if (!coverImageInput) {
    return NextResponse.json({ error: "カバー画像URLは必須です" }, { status: 400 })
  }
  if (!isAllowedImageUrl(coverImageInput)) {
    return NextResponse.json({ error: "カバー画像URLが不正です（http(s)の絶対URLかローカルパスのみ）" }, { status: 400 })
  }
  const coverImage = coverImageInput
  if (bodyParagraphs.length === 0) {
    return NextResponse.json({ error: "本文が空です" }, { status: 400 })
  }

  const newId = generateId(`${draft.id}-${Date.now()}`)
  const article: Article = {
    id: newId,
    slug: generateSlug(title, newId),
    title,
    excerpt,
    bodyParagraphs,
    coverImage,
    coverImageAlt,
    galleryImages,
    category,
    brands,
    tags,
    publishedAt: new Date().toISOString(),
    featured: Boolean(body.featured),
    affiliateLinks,
    officialLinks,
    sourceRefs: draft.sourceRefs,
  }

  publishArticle(article)
  removeDraft(draft.id)

  return NextResponse.json({ ok: true, slug: article.slug })
}
