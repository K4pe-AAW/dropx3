import crypto from "crypto"
import { put, head } from "@vercel/blob"
import { Article, ArticlesData, Draft, DraftsData, ScheduledArticle, ScheduledArticlesData } from "./types"

const ARTICLES_PATH = "data/articles.json"
const DRAFTS_PATH = "data/drafts.json"
const SCHEDULED_PATH = "data/scheduled.json"

/** SOURCE WATCH等、他モジュールからも同じBlob read-modify-write規約を使うためexportする */
export async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN が設定されていません。VercelダッシュボードのStorageタブでBlobを作成し、.env.localに追加してください。"
    )
  }
  try {
    const info = await head(pathname).catch(() => null)
    if (!info) return fallback
    // CDNエッジキャッシュが直後の上書きを反映しないことがあるため、毎回ユニークなURLで強制的にバイパスする
    const bustedUrl = `${info.url}${info.url.includes("?") ? "&" : "?"}_=${Date.now()}`
    const res = await fetch(bustedUrl, { cache: "no-store" })
    if (!res.ok) return fallback
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

export async function writeJson(pathname: string, data: unknown) {
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

/**
 * put()が成功を返しても直後のreadJson()にまだ反映されていないことがある(head/fetchを
 * キャッシュバイパスしても発生する、Blob側の反映遅延)。保存直後にユーザーへ結果を見せる画面
 * (SOURCE WATCHのON/OFFトグル等)では、書いた内容を読み直して一致を確認し、一致しなければ
 * 少し待って書き直す。一致しないまま試行回数を使い切った場合も最後の書き込みは行われているため、
 * 呼び出し元は例外を気にせず進めてよい(反映が遅れているだけで書き込み自体は失われない)。
 */
export async function writeJsonVerified<T>(pathname: string, data: T, attempts = 3): Promise<void> {
  const expected = JSON.stringify(data)
  for (let i = 0; i < attempts; i++) {
    await writeJson(pathname, data)
    const reread = await readJson<T | null>(pathname, null as T | null)
    if (JSON.stringify(reread) === expected) return
    if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

/**
 * 画像等バイナリファイルをBlobへ保存し公開URLを返す。古着屋(tonari/ROOM)手動投稿フォーム等、
 * git commit/pushを経由せずランタイムのadmin APIから直接画像を受け付けたい用途向け
 * (従来の`public/images/`へのgit経由の画像は編集記事のカバー画像等では引き続き使用可)。
 */
export async function putBlobFile(pathname: string, data: Buffer, contentType: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN が設定されていません。VercelダッシュボードのStorageタブでBlobを作成し、.env.localに追加してください。"
    )
  }
  const blob = await put(pathname, data, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  })
  return blob.url
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

export async function getArticleById(id: string): Promise<Article | undefined> {
  const { articles } = await readArticles()
  return articles.find((a) => a.id === id)
}

/** 公開済み記事を編集する。slugは変更しない(公開URL・外部からのリンクを壊さないため) */
export async function updateArticle(id: string, patch: Partial<Omit<Article, "id" | "slug">>): Promise<Article> {
  const data = await readArticles()
  const article = data.articles.find((a) => a.id === id)
  if (!article) throw new Error(`article not found: ${id}`)
  Object.assign(article, patch, { updatedAt: new Date().toISOString() })
  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)
  return article
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

/** 公開済み記事を非公開にする(ハードデリートではなく除去のみ。呼び出し側でrejected draft化して残す運用) */
export async function unpublishArticle(id: string): Promise<Article> {
  const data = await readArticles()
  const article = data.articles.find((a) => a.id === id)
  if (!article) throw new Error(`article not found: ${id}`)
  data.articles = data.articles.filter((a) => a.id !== id)
  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)
  return article
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

// --- Scheduled articles (公開日時が未来の記事。articles.jsonには入れず、cronが昇格させる) ---

export async function readScheduledArticles(): Promise<ScheduledArticlesData> {
  return readJson<ScheduledArticlesData>(SCHEDULED_PATH, { scheduled: [] })
}

export async function writeScheduledArticles(data: ScheduledArticlesData) {
  await writeJson(SCHEDULED_PATH, data)
}

export async function getScheduledArticles(): Promise<ScheduledArticle[]> {
  const { scheduled } = await readScheduledArticles()
  return scheduled.slice().sort((a, b) => (a.scheduledPublishAt < b.scheduledPublishAt ? -1 : 1))
}

export async function addScheduledArticle(article: ScheduledArticle) {
  const data = await readScheduledArticles()
  data.scheduled = data.scheduled.filter((a) => a.id !== article.id)
  data.scheduled.push(article)
  await writeScheduledArticles(data)
}

export async function removeScheduledArticle(id: string) {
  const data = await readScheduledArticles()
  data.scheduled = data.scheduled.filter((a) => a.id !== id)
  await writeScheduledArticles(data)
}

/**
 * scheduledPublishAtを過ぎた予約記事をarticles.jsonへ昇格させる(publishedAt=scheduledPublishAt)。
 * scheduled.json・articles.jsonそれぞれについて単一トランザクション(1回読んで1回書く)を守る
 * ——2ファイルにまたがるが、両方ともこの関数内で完結させ、この関数の呼び出し元(cron)が
 * 短時間に連続実行されない前提(実行間隔は呼び出し側のcron設定に依存)。
 */
export async function promoteDueScheduledArticles(): Promise<{ promoted: number; titles: string[] }> {
  const scheduledData = await readScheduledArticles()
  const now = Date.now()
  const due = scheduledData.scheduled.filter((a) => new Date(a.scheduledPublishAt).getTime() <= now)
  if (due.length === 0) return { promoted: 0, titles: [] }

  const articlesData = await readArticles()
  for (const item of due) {
    const { scheduledPublishAt, ...rest } = item
    const article: Article = { ...rest, publishedAt: scheduledPublishAt }
    articlesData.articles = articlesData.articles.filter((a) => a.id !== article.id)
    articlesData.articles.unshift(article)
  }
  articlesData.lastUpdated = new Date().toISOString()
  await writeArticles(articlesData)

  scheduledData.scheduled = scheduledData.scheduled.filter((a) => !due.some((d) => d.id === a.id))
  await writeScheduledArticles(scheduledData)

  return { promoted: due.length, titles: due.map((a) => a.title) }
}
