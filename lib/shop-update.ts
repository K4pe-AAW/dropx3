import { mutateArticles, generateId, generateSlug } from "@/lib/storage"
import { isSafeExternalUrl, sanitizeAffiliateLinks } from "@/lib/affiliate"
import type { AffiliateLink, Article, ArticlesData, GalleryImage } from "@/lib/types"
import { inferContentType } from "@/lib/content-type"

/**
 * 画像使用許諾済みの古着屋(tonari/ROOM)の投稿を1記事として公開する共有ロジック。
 * app/api/admin/publish-shop-update(旧: 自動化ルーティンのJSON直接投稿)と
 * app/api/admin/vintage-shop/publish(手動貼り付け+画像アップロード)の両方から呼ばれる。
 * Instagram投稿URLごとに必ず別記事を作る。同じ店舗・同じ日でも記事を結合しない。
 * 同じInstagram投稿URL(sourceRefs)からの二重追加だけを防ぐ。
 */
export const SHOP_INFO: Record<string, { label: string; officialUrl: string }> = {
  tonari: { label: "tonari 公式Instagram", officialUrl: "https://www.instagram.com/tonari.yutenji/" },
  ROOM: { label: "ROOM 公式Instagram", officialUrl: "https://www.instagram.com/room_sangenjaya/" },
}

/**
 * Instagram投稿URLを正規化する(?img_index=N・?locale=xx等のクエリを除去し、末尾スラッシュを揃える)。
 * 同じ投稿でもクエリ違いで別URL扱いになり重複チェック(sourceRefs)が効かなくなるのを防ぐ。
 */
export function normalizePostUrl(url: string): string {
  try {
    const u = new URL(url)
    if (/(^|\.)instagram\.com$/.test(u.hostname)) {
      u.search = ""
      u.hash = ""
      if (!u.pathname.endsWith("/")) u.pathname += "/"
      return u.toString()
    }
    return url
  } catch {
    return url
  }
}

export function isAllowedImageUrl(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true
  return isSafeExternalUrl(url)
}

export function sanitizeGalleryImages(input: unknown): GalleryImage[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((img): img is { url?: unknown; alt?: unknown } => typeof img === "object" && img !== null)
    .map((img) => ({
      url: typeof img.url === "string" ? img.url.trim() : "",
      alt: typeof img.alt === "string" ? img.alt : "",
    }))
    .filter((img) => img.url && isAllowedImageUrl(img.url))
}

export type ShopUpdateInput = {
  shop: string
  title: string
  excerpt: string
  bodyParagraphs: string[]
  coverImage: string
  coverImageAlt: string
  galleryImages: GalleryImage[]
  postUrl: string
  tags: string[]
  extraBrands: string[]
  affiliateLinks: AffiliateLink[]
}

export type ShopUpdateResult =
  | { ok: true; merged: boolean; slug: string; id: string }
  | { error: string; status: number; existingSlug?: string }

export function addDistinctShopArticle(
  data: ArticlesData,
  article: Article,
  normalizedPostUrl: string
): { added: true } | { added: false; duplicate: Article } {
  const duplicate = data.articles.find((existing) =>
    existing.sourceRefs.some((ref) => normalizePostUrl(ref.url) === normalizedPostUrl)
  )
  if (duplicate) return { added: false, duplicate }

  data.articles.unshift(article)
  data.lastUpdated = article.publishedAt
  return { added: true }
}

export async function publishShopUpdate(input: ShopUpdateInput): Promise<ShopUpdateResult> {
  const shopInfo = SHOP_INFO[input.shop]
  if (!shopInfo) {
    return { error: `shop must be one of: ${Object.keys(SHOP_INFO).join(", ")}`, status: 400 }
  }
  if (!input.title || !input.excerpt || input.bodyParagraphs.length === 0) {
    return { error: "title/excerpt/bodyParagraphsは必須です", status: 400 }
  }
  if (!input.coverImage || !isAllowedImageUrl(input.coverImage)) {
    return { error: "coverImageが未設定か不正です", status: 400 }
  }
  if (!input.postUrl || !isSafeExternalUrl(input.postUrl)) {
    return { error: "postUrl(Instagram投稿URL)が必須です", status: 400 }
  }
  const postUrl = normalizePostUrl(input.postUrl)
  const affiliateLinks = sanitizeAffiliateLinks(input.affiliateLinks)

  const newId = generateId(`vintage-post-${input.shop}-${postUrl}`)
  const publishedAt = new Date().toISOString()
  const article: Article = {
    id: newId,
    slug: generateSlug(input.title, newId),
    title: input.title,
    excerpt: input.excerpt,
    bodyParagraphs: input.bodyParagraphs,
    coverImage: input.coverImage,
    coverImageAlt: input.coverImageAlt,
    galleryImages: input.galleryImages,
    category: "vintage",
    contentType: inferContentType("vintage", affiliateLinks.length > 0),
    brands: [input.shop, ...input.extraBrands],
    tags: input.tags,
    publishedAt,
    featured: false,
    affiliateLinks,
    officialLinks: [{ label: shopInfo.label, url: shopInfo.officialUrl }],
    sourceRefs: [{ name: shopInfo.label, url: postUrl }],
  }

  let outcome: ReturnType<typeof addDistinctShopArticle> | undefined
  await mutateArticles((data) => {
    outcome = addDistinctShopArticle(data, article, postUrl)
    return data
  })
  if (outcome && !outcome.added) {
    return { error: "この投稿は既に記事化済みです", status: 409, existingSlug: outcome.duplicate.slug }
  }
  return { ok: true, merged: false, slug: article.slug, id: article.id }
}
