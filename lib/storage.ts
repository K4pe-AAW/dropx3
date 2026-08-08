import crypto from "crypto"
import { put, head } from "@vercel/blob"
import { Article, ArticlesData, Draft, DraftsData } from "./types"

const ARTICLES_PATH = "data/articles.json"
const DRAFTS_PATH = "data/drafts.json"

async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN が設定されていません。VercelダッシュボードのStorageタブでBlobを作成し、.env.localに追加してください。"
    )
  }
  try {
    const info = await head(pathname).catch(() => null)
    if (!info) return fallback
    const res = await fetch(info.url, { cache: "no-store" })
    if (!res.ok) return fallback
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

async function writeJson(pathname: string, data: unknown) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN が設定されていません。VercelダッシュボードのStorageタブでBlobを作成し、.env.localに追加してください。"
    )
  }
  await put(pathname, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  })
}

export function generateId(seed: string): string {
  return crypto.createHash("md5").update(seed).digest("hex")
}

export function generateSlug(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 60)
  return `${base || "post"}-${id.slice(0, 8)}`
}

// --- Articles (公開済み) ---

export async function readArticles(): Promise<ArticlesData> {
  return readJson<ArticlesData>(ARTICLES_PATH, { articles: [], lastUpdated: new Date().toISOString() })
}

export async function writeArticles(data: ArticlesData) {
  await writeJson(ARTICLES_PATH, data)
}

export async function getAllArticles(): Promise<Article[]> {
  // publishedAtはUTC('Z')とJST('+09:00')が混在しうるため、文字列比較ではなく実時刻で比較する
  const { articles } = await readArticles()
  return articles.slice().sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  // Next.jsのdynamic route paramsがURLエンコードされたまま渡ってくることがあるため明示的にデコードする
  let decoded = slug
  try {
    decoded = decodeURIComponent(slug)
  } catch {
    // 不正なエンコーディングなら元の文字列のまま照合を試みる
  }
  const { articles } = await readArticles()
  return articles.find((a) => a.slug === decoded)
}

export async function getArticlesByCategory(category: string): Promise<Article[]> {
  const all = await getAllArticles()
  return all.filter((a) => a.category === category)
}

export async function getArticlesByBrand(brand: string): Promise<Article[]> {
  const target = decodeURIComponent(brand).toLowerCase()
  const all = await getAllArticles()
  return all.filter((a) => a.brands.some((b) => b.toLowerCase() === target))
}

export async function getFeaturedArticles(limit = 6): Promise<Article[]> {
  const all = await getAllArticles()
  const featured = all.filter((a) => a.featured)
  return (featured.length > 0 ? featured : all).slice(0, limit)
}

export async function getRelatedArticles(article: Article, limit = 4): Promise<Article[]> {
  const brandSet = new Set(article.brands.map((b) => b.toLowerCase()))
  const all = await getAllArticles()
  return all
    .filter((a) => a.id !== article.id)
    .filter((a) => a.category === article.category || a.brands.some((b) => brandSet.has(b.toLowerCase())))
    .slice(0, limit)
}

export async function getAllBrands(): Promise<{ name: string; count: number }[]> {
  const counts = new Map<string, number>()
  const all = await getAllArticles()
  for (const a of all) {
    for (const b of a.brands) counts.set(b, (counts.get(b) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
}

export async function getArchiveMonths(): Promise<{ key: string; label: string; count: number }[]> {
  const counts = new Map<string, number>()
  const all = await getAllArticles()
  for (const a of all) {
    const d = new Date(a.publishedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([key, count]) => {
      const [y, m] = key.split("-")
      return { key, label: `${y}年${Number(m)}月`, count }
    })
    .sort((a, b) => (a.key < b.key ? 1 : -1))
}

export async function publishArticle(article: Article) {
  const data = await readArticles()
  data.articles = data.articles.filter((a) => a.id !== article.id)
  data.articles.unshift(article)
  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)
}

// --- Drafts (収集パイプラインの出力。人間のレビュー待ち) ---

export async function readDrafts(): Promise<DraftsData> {
  return readJson<DraftsData>(DRAFTS_PATH, { drafts: [] })
}

export async function writeDrafts(data: DraftsData) {
  await writeJson(DRAFTS_PATH, data)
}

export async function getPendingDrafts(): Promise<Draft[]> {
  const { drafts } = await readDrafts()
  return drafts.filter((d) => d.status === "pending").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getDraftById(id: string): Promise<Draft | undefined> {
  const { drafts } = await readDrafts()
  return drafts.find((d) => d.id === id)
}

export async function addDrafts(newDrafts: Draft[]): Promise<{ saved: number; skipped: number }> {
  const data = await readDrafts()
  let saved = 0
  let skipped = 0

  for (const draft of newDrafts) {
    const isDup = data.drafts.some((d) =>
      d.sourceRefs.some((ref) => draft.sourceRefs.some((r) => r.url === ref.url))
    )
    if (isDup) {
      skipped++
      continue
    }
    data.drafts.unshift(draft)
    saved++
  }

  // 保留分が溜まりすぎないよう上限を設ける
  if (data.drafts.length > 300) {
    data.drafts = data.drafts.slice(0, 300)
  }

  await writeDrafts(data)
  return { saved, skipped }
}

export async function updateDraftStatus(id: string, status: Draft["status"]) {
  const data = await readDrafts()
  const draft = data.drafts.find((d) => d.id === id)
  if (draft) draft.status = status
  await writeDrafts(data)
}

export async function removeDraft(id: string) {
  const data = await readDrafts()
  data.drafts = data.drafts.filter((d) => d.id !== id)
  await writeDrafts(data)
}
