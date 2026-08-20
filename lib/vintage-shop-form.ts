import { putBlobFile } from "@/lib/storage"
import { SHOP_INFO } from "@/lib/shop-update"
import { sanitizeAffiliateLinks } from "@/lib/affiliate"
import type { AffiliateLink, GalleryImage } from "@/lib/types"

/**
 * app/api/admin/vintage-shop/publish と .../drafts の両方が同じmultipart/form-data
 * 形式を受け取る(公開するか下書き保存するかの違いだけ)ため、パース+画像アップロードを共有する。
 */
export type ParsedVintageForm = {
  shop: string
  title: string
  excerpt: string
  bodyParagraphs: string[]
  postUrl: string
  affiliateLinks: AffiliateLink[]
  tags: string[]
  coverImage: string
  coverImageAlt: string
  galleryImages: GalleryImage[]
}

export type ParseVintageFormResult = { ok: true; value: ParsedVintageForm } | { ok: false; error: string; status: number }

function extFromMime(type: string): string {
  if (type === "image/png") return "png"
  if (type === "image/webp") return "webp"
  if (type === "image/gif") return "gif"
  return "jpg"
}

async function uploadVintageImage(file: File, shop: string, tag: string): Promise<{ url: string; alt: string }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const pathname = `images/vintage-shop/${shop}-${Date.now()}-${tag}.${extFromMime(file.type)}`
  const url = await putBlobFile(pathname, buffer, file.type || "image/jpeg")
  return { url, alt: "" }
}

export async function parseVintageShopForm(form: FormData): Promise<ParseVintageFormResult> {
  const shop = String(form.get("shop") ?? "")
  if (!SHOP_INFO[shop]) {
    return { ok: false, error: `shop must be one of: ${Object.keys(SHOP_INFO).join(", ")}`, status: 400 }
  }

  const title = String(form.get("title") ?? "").trim()
  const excerpt = String(form.get("excerpt") ?? "").trim()
  const postUrl = String(form.get("postUrl") ?? "").trim()
  const coverImageAltInput = String(form.get("coverImageAlt") ?? "").trim()

  let bodyParagraphs: string[] = []
  let tags: string[] = ["古着"]
  let affiliateLinks: AffiliateLink[] = []
  try {
    const rawParagraphs = JSON.parse(String(form.get("bodyParagraphs") ?? "[]"))
    if (Array.isArray(rawParagraphs)) {
      bodyParagraphs = rawParagraphs.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    }
    const rawTags = JSON.parse(String(form.get("tags") ?? "[]"))
    if (Array.isArray(rawTags) && rawTags.length > 0) {
      tags = rawTags.filter((t): t is string => typeof t === "string")
    }
    const rawLinks = JSON.parse(String(form.get("affiliateLinks") ?? "[]"))
    if (Array.isArray(rawLinks)) {
      affiliateLinks = sanitizeAffiliateLinks(
        rawLinks
          .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
          .map((l) => ({
            label: typeof l.label === "string" ? l.label.trim() : "",
            retailer: typeof l.retailer === "string" ? l.retailer.trim() : "",
            url: typeof l.url === "string" ? l.url.trim() : "",
            ...(typeof l.price === "string" && l.price.trim() ? { price: l.price.trim() } : {}),
          }))
          .filter((l) => l.label && l.url)
      )
    }
  } catch {
    return { ok: false, error: "bodyParagraphs/tags/affiliateLinksのJSON形式が不正です", status: 400 }
  }

  const coverImageFile = form.get("coverImage")
  if (!(coverImageFile instanceof File) || coverImageFile.size === 0) {
    return { ok: false, error: "カバー画像ファイルが必須です", status: 400 }
  }
  if (!coverImageFile.type.startsWith("image/")) {
    return { ok: false, error: "カバー画像は画像ファイルである必要があります", status: 400 }
  }

  const galleryFiles = form.getAll("galleryImages").filter((f): f is File => f instanceof File && f.size > 0)

  const cover = await uploadVintageImage(coverImageFile, shop, "cover")
  const coverImageAlt = coverImageAltInput || title
  cover.alt = coverImageAlt

  const galleryImages: GalleryImage[] = []
  for (let i = 0; i < galleryFiles.length; i++) {
    galleryImages.push(await uploadVintageImage(galleryFiles[i], shop, `g${i}`))
  }

  return {
    ok: true,
    value: { shop, title, excerpt, bodyParagraphs, postUrl, affiliateLinks, tags, coverImage: cover.url, coverImageAlt, galleryImages },
  }
}
