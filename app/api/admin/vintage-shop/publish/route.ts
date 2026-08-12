import { NextRequest, NextResponse } from "next/server"
import { putBlobFile } from "@/lib/storage"
import { publishShopUpdate, SHOP_INFO } from "@/lib/shop-update"

/**
 * 古着屋(tonari/ROOM)の投稿を、人間が貼り付けたテキスト+アップロードした画像ファイルから公開する。
 * 画像はVercel Blobへ直接保存する(git commit/push/デプロイ待ちが不要——publish-shop-updateの
 * 旧フロー(`/images/xxx.jpg`をコミットしてから叩く)と違い、この管理画面から完結できる)。
 */
function extFromMime(type: string): string {
  if (type === "image/png") return "png"
  if (type === "image/webp") return "webp"
  if (type === "image/gif") return "gif"
  return "jpg"
}

async function uploadImage(file: File, shop: string, tag: string): Promise<{ url: string; alt: string }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const pathname = `images/vintage-shop/${shop}-${Date.now()}-${tag}.${extFromMime(file.type)}`
  const url = await putBlobFile(pathname, buffer, file.type || "image/jpeg")
  return { url, alt: "" }
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "invalid form data" }, { status: 400 })

  const shop = String(form.get("shop") ?? "")
  const shopInfo = SHOP_INFO[shop]
  if (!shopInfo) {
    return NextResponse.json({ error: `shop must be one of: ${Object.keys(SHOP_INFO).join(", ")}` }, { status: 400 })
  }

  const title = String(form.get("title") ?? "").trim()
  const excerpt = String(form.get("excerpt") ?? "").trim()
  const postUrl = String(form.get("postUrl") ?? "").trim()
  const mercariSearchQuery = String(form.get("mercariSearchQuery") ?? "").trim()
  const coverImageAltInput = String(form.get("coverImageAlt") ?? "").trim()

  let bodyParagraphs: string[] = []
  let tags: string[] = ["古着"]
  try {
    const rawParagraphs = JSON.parse(String(form.get("bodyParagraphs") ?? "[]"))
    if (Array.isArray(rawParagraphs)) {
      bodyParagraphs = rawParagraphs.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    }
    const rawTags = JSON.parse(String(form.get("tags") ?? "[]"))
    if (Array.isArray(rawTags) && rawTags.length > 0) {
      tags = rawTags.filter((t): t is string => typeof t === "string")
    }
  } catch {
    return NextResponse.json({ error: "bodyParagraphs/tagsのJSON形式が不正です" }, { status: 400 })
  }

  const coverImageFile = form.get("coverImage")
  if (!(coverImageFile instanceof File) || coverImageFile.size === 0) {
    return NextResponse.json({ error: "カバー画像ファイルが必須です" }, { status: 400 })
  }
  if (!coverImageFile.type.startsWith("image/")) {
    return NextResponse.json({ error: "カバー画像は画像ファイルである必要があります" }, { status: 400 })
  }

  const galleryFiles = form.getAll("galleryImages").filter((f): f is File => f instanceof File && f.size > 0)

  const cover = await uploadImage(coverImageFile, shop, "cover")
  const coverImageAlt = coverImageAltInput || title
  cover.alt = coverImageAlt

  const galleryImages: { url: string; alt: string }[] = []
  for (let i = 0; i < galleryFiles.length; i++) {
    galleryImages.push(await uploadImage(galleryFiles[i], shop, `g${i}`))
  }

  const result = await publishShopUpdate({
    shop,
    title,
    excerpt,
    bodyParagraphs,
    coverImage: cover.url,
    coverImageAlt,
    galleryImages,
    postUrl,
    tags,
    extraBrands: [],
    mercariSearchQuery,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error, existingSlug: result.existingSlug }, { status: result.status })
  }
  return NextResponse.json(result)
}
