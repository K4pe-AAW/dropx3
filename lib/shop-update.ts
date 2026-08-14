import { readArticles, writeArticles, generateId, generateSlug } from "@/lib/storage"
import { isSafeExternalUrl, sanitizeAffiliateLinks, buildMercariSearchLink } from "@/lib/affiliate"
import type { Article, GalleryImage } from "@/lib/types"

/**
 * 画像使用許諾済みの古着屋(tonari/ROOM)の投稿を1記事として公開する共有ロジック。
 * app/api/admin/publish-shop-update(旧: 自動化ルーティンのJSON直接投稿)と
 * app/api/admin/vintage-shop/publish(手動貼り付け+画像アップロード)の両方から呼ばれる。
 * 1日1ショップにつき「その日の記事」を1本だけ保つ運用。同じ日(JST)にそのショップの
 * 記事が既にあれば、新しい投稿を既存記事へ追記(ギャラリー画像・本文・出典を追加)する。
 * 同じInstagram投稿URL(sourceRefs)からの重複追加は防ぐ。
 */
export const SHOP_INFO: Record<string, { label: string; officialUrl: string }> = {
  tonari: { label: "tonari 公式Instagram", officialUrl: "https://www.instagram.com/tonari.yutenji/" },
  ROOM: { label: "ROOM 公式Instagram", officialUrl: "https://www.instagram.com/room_sangenjaya/" },
}

/** JSTでのYYYY-MM-DDを返す(publishedAtの日付比較を日本時間基準で行うため) */
function jstDateKey(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
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
  mercariSearchQuery: string
}

export type ShopUpdateResult =
  | { ok: true; merged: boolean; slug: string }
  | { error: string; status: number; existingSlug?: string }

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
  if (!input.mercariSearchQuery) {
    return {
      error: "mercariSearchQueryが必須です(例: 'HELMUT LANG デニムショーツ'。'古着'のようなカテゴリ名のみは不可)",
      status: 400,
    }
  }

  let mercariLink
  try {
    mercariLink = buildMercariSearchLink(input.mercariSearchQuery)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "mercariSearchQueryが不正です", status: 400 }
  }

  const data = await readArticles()

  const dup = data.articles.find((a) => a.sourceRefs.some((r) => r.url === postUrl))
  if (dup) {
    return { error: "この投稿は既に記事化済みです", status: 409, existingSlug: dup.slug }
  }

  const todayKey = jstDateKey(new Date().toISOString())
  const existingToday = data.articles.find(
    (a) => a.category === "vintage" && a.brands.includes(input.shop) && jstDateKey(a.publishedAt) === todayKey
  )

  if (existingToday) {
    existingToday.galleryImages.push({ url: input.coverImage, alt: input.coverImageAlt }, ...input.galleryImages)
    existingToday.bodyParagraphs.push(...input.bodyParagraphs)
    existingToday.sourceRefs.push({ name: shopInfo.label, url: postUrl })
    if (!existingToday.affiliateLinks.some((l) => l.url === mercariLink.url)) {
      existingToday.affiliateLinks.push(...sanitizeAffiliateLinks([mercariLink]))
    }
    existingToday.updatedAt = new Date().toISOString()
    await writeArticles(data)
    return { ok: true, merged: true, slug: existingToday.slug }
  }

  const newId = generateId(`${input.shop}-${postUrl}-${Date.now()}`)
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
    brands: [input.shop, ...input.extraBrands],
    tags: input.tags,
    publishedAt: new Date().toISOString(),
    featured: false,
    affiliateLinks: sanitizeAffiliateLinks([mercariLink]),
    officialLinks: [{ label: shopInfo.label, url: shopInfo.officialUrl }],
    sourceRefs: [{ name: shopInfo.label, url: postUrl }],
  }

  data.articles.unshift(article)
  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)
  return { ok: true, merged: false, slug: article.slug }
}
