import type { Category, ContentType } from "./types"

export const CONTENT_TYPES: ContentType[] = ["NEWS", "BUY", "GUIDE", "VIDEO"]

export function isContentType(value: unknown): value is ContentType {
  return typeof value === "string" && CONTENT_TYPES.includes(value as ContentType)
}

/** 既存記事・下書きの初期値。管理画面で人が必要に応じて上書きできる。 */
export function inferContentType(category: Category, hasCommerceLinks = false): ContentType {
  if (category === "youtube") return "VIDEO"
  if (hasCommerceLinks) return "BUY"
  if (category === "news" || category === "brand") return "NEWS"
  return "GUIDE"
}
