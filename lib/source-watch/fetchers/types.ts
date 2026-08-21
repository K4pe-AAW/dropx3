export type FetchedItem = {
  url: string
  title: string
  publishedAt?: string
  rawText?: string
  /** 記事ページのHTML(og:image/本文img)やRSSのenclosure等から機械的に集めた画像URL候補 */
  imageCandidates?: string[]
}

export type FetchResult = { items: FetchedItem[]; errors: string[]; httpStatus?: number }
