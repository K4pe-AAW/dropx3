import { readJson, writeJson, writeJsonVerified, generateId } from "@/lib/storage"
import { normalizeUrl } from "./normalize"
import type { CrawlLog, ImageAsset, Product, Source, SourceItem, SourceLink } from "./types"

const SOURCES_PATH = "data/source-watch/sources.json"
const SOURCE_ITEMS_PATH = "data/source-watch/source-items.json"
const PRODUCTS_PATH = "data/source-watch/products.json"
const SOURCE_LINKS_PATH = "data/source-watch/source-links.json"
const IMAGE_ASSETS_PATH = "data/source-watch/image-assets.json"
const CRAWL_LOGS_PATH = "data/source-watch/crawl-logs.json"

// 無制限に肥大化させない上限。draftsの300件キャップ(lib/storage.ts)と同じ考え方
const MAX_SOURCE_ITEMS = 3000
const MAX_CRAWL_LOGS_PER_SOURCE = 30

// --- Sources ---

export async function listSources(): Promise<Source[]> {
  const { sources } = await readJson<{ sources: Source[] }>(SOURCES_PATH, { sources: [] })
  return sources
}

export async function getSource(id: string): Promise<Source | undefined> {
  const sources = await listSources()
  return sources.find((s) => s.id === id)
}

/** 既存と同じidがあれば上書きしない(シード投入の冪等性のため)。新規のみ追加する */
export async function seedSourcesIfMissing(newSources: Source[]): Promise<{ added: number }> {
  const data = await readJson<{ sources: Source[] }>(SOURCES_PATH, { sources: [] })
  const existingIds = new Set(data.sources.map((s) => s.id))
  let added = 0
  for (const s of newSources) {
    if (existingIds.has(s.id)) continue
    data.sources.push(s)
    added++
  }
  if (added > 0) await writeJson(SOURCES_PATH, data)
  return { added }
}

/** 管理画面の「Instagramアカウントを追加」等、1件だけを即座に登録するための単体追加。既存idと衝突する場合はエラー */
export async function addSource(input: Source): Promise<Source> {
  const data = await readJson<{ sources: Source[] }>(SOURCES_PATH, { sources: [] })
  if (data.sources.some((s) => s.id === input.id)) throw new Error(`source already exists: ${input.id}`)
  data.sources.push(input)
  await writeJsonVerified(SOURCES_PATH, data)
  return input
}

export async function updateSource(id: string, patch: Partial<Omit<Source, "id" | "createdAt">>): Promise<Source> {
  const data = await readJson<{ sources: Source[] }>(SOURCES_PATH, { sources: [] })
  const source = data.sources.find((s) => s.id === id)
  if (!source) throw new Error(`source not found: ${id}`)
  Object.assign(source, patch, { updatedAt: new Date().toISOString() })
  // URL未確認のソースを誤って有効化しないための最終防衛線
  if (!source.url) source.enabled = false
  await writeJsonVerified(SOURCES_PATH, data)
  return source
}

/** 管理画面の「削除」。ソフト無効化(enabled:false)とは別に、一覧から完全に取り除く */
export async function removeSource(id: string): Promise<boolean> {
  const data = await readJson<{ sources: Source[] }>(SOURCES_PATH, { sources: [] })
  const before = data.sources.length
  data.sources = data.sources.filter((s) => s.id !== id)
  if (data.sources.length === before) return false
  await writeJsonVerified(SOURCES_PATH, data)
  return true
}

// --- SourceItems ---

export async function listSourceItems(sourceId?: string): Promise<SourceItem[]> {
  const { items } = await readJson<{ items: SourceItem[] }>(SOURCE_ITEMS_PATH, { items: [] })
  return sourceId ? items.filter((i) => i.sourceId === sourceId) : items
}

/**
 * 同じURLを何度も登録しないための重複判定。トラッキングパラメータや末尾スラッシュの違いを
 * 無視して比較する(lib/source-watch/normalize.ts)。商品単位の重複判定(型番優先)は
 * Product側(findProductByMatchKey)が別途担う。
 */
export async function findSourceItemByUrl(sourceUrl: string): Promise<SourceItem | undefined> {
  const items = await listSourceItems()
  const target = normalizeUrl(sourceUrl)
  return items.find((i) => normalizeUrl(i.sourceUrl) === target)
}

export async function createSourceItem(input: Omit<SourceItem, "id">): Promise<SourceItem> {
  const data = await readJson<{ items: SourceItem[] }>(SOURCE_ITEMS_PATH, { items: [] })
  const item: SourceItem = { ...input, id: generateId(`${input.sourceUrl}-${input.sourceId}`) }
  data.items.unshift(item)
  if (data.items.length > MAX_SOURCE_ITEMS) data.items = data.items.slice(0, MAX_SOURCE_ITEMS)
  await writeJson(SOURCE_ITEMS_PATH, data)
  return item
}

export async function updateSourceItem(id: string, patch: Partial<SourceItem>): Promise<SourceItem | undefined> {
  const data = await readJson<{ items: SourceItem[] }>(SOURCE_ITEMS_PATH, { items: [] })
  const item = data.items.find((i) => i.id === id)
  if (!item) return undefined
  Object.assign(item, patch)
  await writeJson(SOURCE_ITEMS_PATH, data)
  return item
}

// --- Products ---

export async function listProducts(): Promise<Product[]> {
  const { products } = await readJson<{ products: Product[] }>(PRODUCTS_PATH, { products: [] })
  return products
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const products = await listProducts()
  return products.find((p) => p.id === id)
}

export async function findProductByMatchKey(
  styleCode: string | null,
  normalizedBrand: string | null,
  normalizedModelName: string | null
): Promise<Product | undefined> {
  const products = await listProducts()
  if (styleCode) {
    const byStyle = products.find((p) => p.styleCode && p.styleCode === styleCode)
    if (byStyle) return byStyle
  }
  if (normalizedBrand && normalizedModelName) {
    return products.find(
      (p) => p.normalizedBrand === normalizedBrand && p.normalizedModelName === normalizedModelName
    )
  }
  return undefined
}

export async function upsertProduct(product: Product): Promise<Product> {
  const data = await readJson<{ products: Product[] }>(PRODUCTS_PATH, { products: [] })
  const idx = data.products.findIndex((p) => p.id === product.id)
  if (idx >= 0) data.products[idx] = product
  else data.products.unshift(product)
  await writeJson(PRODUCTS_PATH, data)
  return product
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product> {
  const data = await readJson<{ products: Product[] }>(PRODUCTS_PATH, { products: [] })
  const product = data.products.find((p) => p.id === id)
  if (!product) throw new Error(`product not found: ${id}`)
  Object.assign(product, patch, { updatedAt: new Date().toISOString() })
  await writeJson(PRODUCTS_PATH, data)
  return product
}

/** 一括操作(無視/保留/保留解除)用。1件ずつupdateProductを呼ぶと書き込み回数分だけBlob伝播遅延・
 * 競合リスクが増えるため、1回のread-modify-writeで複数件をまとめて更新する */
export async function updateProductsBulk(ids: string[], patch: Partial<Product>): Promise<string[]> {
  const data = await readJson<{ products: Product[] }>(PRODUCTS_PATH, { products: [] })
  const idSet = new Set(ids)
  const now = new Date().toISOString()
  const updated: string[] = []
  for (const product of data.products) {
    if (!idSet.has(product.id)) continue
    Object.assign(product, patch, { updatedAt: now })
    updated.push(product.id)
  }
  if (updated.length > 0) await writeJson(PRODUCTS_PATH, data)
  return updated
}

// --- SourceLinks ---

export async function listSourceLinks(ids?: string[]): Promise<SourceLink[]> {
  const { links } = await readJson<{ links: SourceLink[] }>(SOURCE_LINKS_PATH, { links: [] })
  return ids ? links.filter((l) => ids.includes(l.id)) : links
}

export async function addSourceLink(input: Omit<SourceLink, "id">): Promise<SourceLink> {
  const data = await readJson<{ links: SourceLink[] }>(SOURCE_LINKS_PATH, { links: [] })
  // 同一URLの重複保存を避ける(同じ商品に対し何度も「公式情報を検索」しても増殖しない)
  const existing = data.links.find((l) => l.url === input.url)
  if (existing) return existing
  const link: SourceLink = { ...input, id: generateId(`${input.url}-link`) }
  data.links.unshift(link)
  await writeJson(SOURCE_LINKS_PATH, data)
  return link
}

// --- ImageAssets ---

export async function listImageAssets(ids?: string[]): Promise<ImageAsset[]> {
  const { assets } = await readJson<{ assets: ImageAsset[] }>(IMAGE_ASSETS_PATH, { assets: [] })
  return ids ? assets.filter((a) => ids.includes(a.id)) : assets
}

export async function addImageAsset(input: Omit<ImageAsset, "id">): Promise<ImageAsset> {
  const data = await readJson<{ assets: ImageAsset[] }>(IMAGE_ASSETS_PATH, { assets: [] })
  const existing = data.assets.find((a) => a.url === input.url)
  if (existing) return existing
  const asset: ImageAsset = { ...input, id: generateId(`${input.url}-asset`) }
  data.assets.unshift(asset)
  await writeJson(IMAGE_ASSETS_PATH, data)
  return asset
}

export async function updateImageAsset(id: string, patch: Partial<ImageAsset>): Promise<ImageAsset | undefined> {
  const data = await readJson<{ assets: ImageAsset[] }>(IMAGE_ASSETS_PATH, { assets: [] })
  const asset = data.assets.find((a) => a.id === id)
  if (!asset) return undefined
  Object.assign(asset, patch)
  await writeJson(IMAGE_ASSETS_PATH, data)
  return asset
}

// --- CrawlLogs ---

export async function recordCrawlLog(input: Omit<CrawlLog, "id">): Promise<CrawlLog> {
  const data = await readJson<{ logs: CrawlLog[] }>(CRAWL_LOGS_PATH, { logs: [] })
  const log: CrawlLog = { ...input, id: generateId(`${input.sourceId}-${input.startedAt}`) }
  data.logs.unshift(log)
  // ソースごとに直近N件だけ残す(全体ではなくソース単位でキャップしないと寡黙なソースのログが埋もれる)
  const perSource = new Map<string, number>()
  data.logs = data.logs.filter((l) => {
    const count = perSource.get(l.sourceId) ?? 0
    perSource.set(l.sourceId, count + 1)
    return count < MAX_CRAWL_LOGS_PER_SOURCE
  })
  await writeJson(CRAWL_LOGS_PATH, data)
  return log
}

export async function listCrawlLogs(sourceId?: string): Promise<CrawlLog[]> {
  const { logs } = await readJson<{ logs: CrawlLog[] }>(CRAWL_LOGS_PATH, { logs: [] })
  return sourceId ? logs.filter((l) => l.sourceId === sourceId) : logs
}

export async function getLatestCrawlLog(sourceId: string): Promise<CrawlLog | undefined> {
  const logs = await listCrawlLogs(sourceId)
  return logs.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))[0]
}
