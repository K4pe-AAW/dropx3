import type { Category, ContentType } from "./types"

export const CONTENT_TYPES: ContentType[] = ["NEWS", "BUY", "GUIDE", "VIDEO", "COLUMN", "PICKS"]

export const EDITORIAL_CONTENT_TYPES = ["COLUMN", "PICKS"] as const satisfies readonly ContentType[]

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  NEWS: "NEWS",
  BUY: "BUY",
  GUIDE: "GUIDE",
  VIDEO: "VIDEO",
  COLUMN: "編集部コラム",
  PICKS: "EDITOR’S PICKS",
}

export function isEditorialContentType(value: ContentType | undefined): value is (typeof EDITORIAL_CONTENT_TYPES)[number] {
  return value === "COLUMN" || value === "PICKS"
}

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
