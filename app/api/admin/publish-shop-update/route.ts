import { NextRequest, NextResponse } from "next/server"
import { readArticles, writeArticles, generateId, generateSlug } from "@/lib/storage"
import { isSafeExternalUrl, sanitizeAffiliateLinks, buildMercariSearchLink } from "@/lib/affiliate"
import type { Article, GalleryImage } from "@/lib/types"

/**
 * 画像使用許諾済みの古着屋(tonari/ROOM)のInstagram投稿を1記事として公開する専用API。
 * 1日1ショップにつき「その日の記事」を1本だけ保つ運用(1日2回、10:00/18:00に呼ばれる想定)。
 * 同じ日(JST)にそのショップの記事が既にあれば、新しい投稿を既存記事へ追記(ギャラリー画像・本文・出典を追加)する。
 * 同じInstagram投稿URL(sourceRefs)からの重複追加は防ぐ。
 * app/api/drafts/[id]/publish と違い下書きを経由せず直接記事化する(下書き一覧を汚さないため)。
 */
const SHOP_INFO: Record<string, { label: string; officialUrl: string }> = {
  tonari: { label: "tonari 公式Instagram", officialUrl: "https://www.instagram.com/tonari.yutenji/" },
  ROOM: { label: "ROOM 公式Instagram", officialUrl: "https://www.instagram.com/room_sangenjaya/" },
}

/** JSTでのYYYY-MM-DDを返す(publishedAtの日付比較を日本時間基準で行うため) */
function jstDateKey(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })

  const shop = body.shop
  const shopInfo = SHOP_INFO[shop]
  if (!shopInfo) {
    return NextResponse.json({ error: `shop must be one of: ${Object.keys(SHOP_INFO).join(", ")}` }, { status: 400 })
  }

  const title: string = typeof body.title === "string" ? body.title.trim() : ""
  const excerpt: string = typeof body.excerpt === "string" ? body.excerpt.trim() : ""
  const bodyParagraphs: string[] = Array.isArray(body.bodyParagraphs)
    ? body.bodyParagraphs.filter((p: unknown): p is string => typeof p === "string" && p.trim().length > 0)
    : []
  const coverImage: string = typeof body.coverImage === "string" ? body.coverImage.trim() : ""
  const coverImageAlt: string = typeof body.coverImageAlt === "string" && body.coverImageAlt.trim() ? body.coverImageAlt : title
  const galleryImages = sanitizeGalleryImages(body.galleryImages)
  const postUrl: string = typeof body.postUrl === "string" ? body.postUrl.trim() : ""
  const tags: string[] = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : ["古着"]
  const extraBrands: string[] = Array.isArray(body.extraBrands)
    ? body.extraBrands.filter((b: unknown) => typeof b === "string")
    : []
  // 「スニーカー」のようなカテゴリ名だけの検索は関連性が低いため、具体的な商品名を呼び出し側に必須で渡させる
  const mercariSearchQuery: string = typeof body.mercariSearchQuery === "string" ? body.mercariSearchQuery.trim() : ""

  if (!title || !excerpt || bodyParagraphs.length === 0) {
    return NextResponse.json({ error: "title/excerpt/bodyParagraphsは必須です" }, { status: 400 })
  }
  if (!coverImage || !isAllowedImageUrl(coverImage)) {
    return NextResponse.json({ error: "coverImageが未設定か不正です" }, { status: 400 })
  }
  if (!postUrl || !isSafeExternalUrl(postUrl)) {
    return NextResponse.json({ error: "postUrl(Instagram投稿URL)が必須です" }, { status: 400 })
  }
  if (!mercariSearchQuery) {
    return NextResponse.json(
      { error: "mercariSearchQueryが必須です(例: 'HELMUT LANG デニムショーツ'。'古着'のようなカテゴリ名のみは不可)" },
      { status: 400 }
    )
  }
  let mercariLink
  try {
    mercariLink = buildMercariSearchLink(mercariSearchQuery)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "mercariSearchQueryが不正です" }, { status: 400 })
  }

  const data = await readArticles()

  // 同じInstagram投稿からの重複公開・重複追記を防ぐ
  const dup = data.articles.find((a) => a.sourceRefs.some((r) => r.url === postUrl))
  if (dup) {
    return NextResponse.json({ error: "この投稿は既に記事化済みです", existingSlug: dup.slug }, { status: 409 })
  }

  const todayKey = jstDateKey(new Date().toISOString())
  const existingToday = data.articles.find(
    (a) => a.category === "vintage" && a.brands.includes(shop) && jstDateKey(a.publishedAt) === todayKey
  )

  if (existingToday) {
    // 同じ日(JST)の同じショップの記事が既にある場合は、新しい投稿をその記事へ追記してまとめる
    existingToday.galleryImages.push({ url: coverImage, alt: coverImageAlt }, ...galleryImages)
    existingToday.bodyParagraphs.push(...bodyParagraphs)
    existingToday.sourceRefs.push({ name: shopInfo.label, url: postUrl })
    if (!existingToday.affiliateLinks.some((l) => l.url === mercariLink.url)) {
      existingToday.affiliateLinks.push(...sanitizeAffiliateLinks([mercariLink]))
    }
    existingToday.updatedAt = new Date().toISOString()
    await writeArticles(data)
    return NextResponse.json({ ok: true, merged: true, slug: existingToday.slug })
  }

  const newId = generateId(`${shop}-${postUrl}-${Date.now()}`)
  const article: Article = {
    id: newId,
    slug: generateSlug(title, newId),
    title,
    excerpt,
    bodyParagraphs,
    coverImage,
    coverImageAlt,
    galleryImages,
    category: "vintage",
    brands: [shop, ...extraBrands],
    tags,
    publishedAt: new Date().toISOString(),
    featured: false,
    affiliateLinks: sanitizeAffiliateLinks([mercariLink]),
    officialLinks: [{ label: shopInfo.label, url: shopInfo.officialUrl }],
    sourceRefs: [{ name: shopInfo.label, url: postUrl }],
  }

  data.articles.unshift(article)
  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)
  return NextResponse.json({ ok: true, merged: false, slug: article.slug })
}
