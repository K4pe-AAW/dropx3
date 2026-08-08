import fs from "fs"
import path from "path"
import crypto from "crypto"
import { Article, ArticlesData, Draft, DraftsData } from "./types"

const ARTICLES_FILE = path.join(process.cwd(), "data", "articles.json")
const DRAFTS_FILE = path.join(process.cwd(), "data", "drafts.json")

function ensureDir(file: string) {
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function readJson<T>(file: string, fallback: T): T {
  ensureDir(file)
  if (!fs.existsSync(file)) return fallback
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"))
  } catch {
    return fallback
  }
}

function writeJson(file: string, data: unknown) {
  ensureDir(file)
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8")
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

export function readArticles(): ArticlesData {
  return readJson<ArticlesData>(ARTICLES_FILE, { articles: [], lastUpdated: new Date().toISOString() })
}

export function writeArticles(data: ArticlesData) {
  writeJson(ARTICLES_FILE, data)
}

export function getAllArticles(): Article[] {
  // publishedAtはUTC('Z')とJST('+09:00')が混在しうるため、文字列比較ではなく実時刻で比較する
  return readArticles()
    .articles.slice()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}

export function getArticleBySlug(slug: string): Article | undefined {
  // Next.jsのdynamic route paramsがURLエンコードされたまま渡ってくることがあるため明示的にデコードする
  let decoded = slug
  try {
    decoded = decodeURIComponent(slug)
  } catch {
    // 不正なエンコーディングなら元の文字列のまま照合を試みる
  }
  return readArticles().articles.find((a) => a.slug === decoded)
}

export function getArticlesByCategory(category: string): Article[] {
  return getAllArticles().filter((a) => a.category === category)
}

export function getArticlesByBrand(brand: string): Article[] {
  const target = decodeURIComponent(brand).toLowerCase()
  return getAllArticles().filter((a) => a.brands.some((b) => b.toLowerCase() === target))
}

export function getFeaturedArticles(limit = 6): Article[] {
  const featured = getAllArticles().filter((a) => a.featured)
  return (featured.length > 0 ? featured : getAllArticles()).slice(0, limit)
}

export function getRelatedArticles(article: Article, limit = 4): Article[] {
  const brandSet = new Set(article.brands.map((b) => b.toLowerCase()))
  return getAllArticles()
    .filter((a) => a.id !== article.id)
    .filter((a) => a.category === article.category || a.brands.some((b) => brandSet.has(b.toLowerCase())))
    .slice(0, limit)
}

export function getAllBrands(): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const a of getAllArticles()) {
    for (const b of a.brands) counts.set(b, (counts.get(b) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
}

export function getArchiveMonths(): { key: string; label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const a of getAllArticles()) {
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

export function publishArticle(article: Article) {
  const data = readArticles()
  data.articles = data.articles.filter((a) => a.id !== article.id)
  data.articles.unshift(article)
  data.lastUpdated = new Date().toISOString()
  writeArticles(data)
}

// --- Drafts (収集パイプラインの出力。人間のレビュー待ち) ---

export function readDrafts(): DraftsData {
  return readJson<DraftsData>(DRAFTS_FILE, { drafts: [] })
}

export function writeDrafts(data: DraftsData) {
  writeJson(DRAFTS_FILE, data)
}

export function getPendingDrafts(): Draft[] {
  return readDrafts()
    .drafts.filter((d) => d.status === "pending")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getDraftById(id: string): Draft | undefined {
  return readDrafts().drafts.find((d) => d.id === id)
}

export function addDrafts(newDrafts: Draft[]): { saved: number; skipped: number } {
  const data = readDrafts()
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

  writeDrafts(data)
  return { saved, skipped }
}

export function updateDraftStatus(id: string, status: Draft["status"]) {
  const data = readDrafts()
  const draft = data.drafts.find((d) => d.id === id)
  if (draft) draft.status = status
  writeDrafts(data)
}

export function removeDraft(id: string) {
  const data = readDrafts()
  data.drafts = data.drafts.filter((d) => d.id !== id)
  writeDrafts(data)
}
