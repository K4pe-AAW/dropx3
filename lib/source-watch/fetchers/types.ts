export type FetchedItem = {
  url: string
  title: string
  publishedAt?: string
  rawText?: string
}

export type FetchResult = { items: FetchedItem[]; errors: string[]; httpStatus?: number }
