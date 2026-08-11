import type { FetchResult } from "./types"

/** 管理画面からのURL手動追加。RSS/Sitemap/HTMLどれも通用しないソース(Instagram/StockX等)向け */
export function manualItem(url: string, title: string, rawText?: string): FetchResult {
  return { items: [{ url, title: title || url, rawText }], errors: [] }
}
