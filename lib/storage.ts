import crypto from "crypto"
import { put, head, BlobPreconditionFailedError } from "@vercel/blob"
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
    // cacheControlMaxAgeの既定値は1ヶ月。頻繁に上書きするJSONデータでこれを使うと、
    // CDNエッジが古いキャッシュを持ち続け、書き込み直後の読み取りが数分〜それ以上古いままになる
    // (readJson側のクエリ文字列キャッシュバスターだけでは防げなかった)。指定可能な最小値まで下げる
    cacheControlMaxAge: 60,
  })
}

async function readJsonWithEtag<T>(pathname: string, fallback: T): Promise<{ data: T; etag: string | null }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN が設定されていません。VercelダッシュボードのStorageタブでBlobを作成し、.env.localに追加してください。"
    )
  }
  try {
    const info = await head(pathname).catch(() => null)
    if (!info) return { data: fallback, etag: null }
    const bustedUrl = `${info.url}${info.url.includes("?") ? "&" : "?"}_=${Date.now()}`
    const res = await fetch(bustedUrl, { cache: "no-store" })
    if (!res.ok) return { data: fallback, etag: info.etag }
    return { data: (await res.json()) as T, etag: info.etag }
  } catch {
    return { data: fallback, etag: null }
  }
}

/**
 * read→mutate→writeを1回のread-modify-writeで済ませると、同じJSONファイルへの更新が
 * 近い時間に重なったとき、後から書いた側が前の変更をまるごと上書きして消してしまう
 * (SOURCE WATCHの情報源一覧のように1ファイルに全件入っている場合、無関係な項目の保存同士でも
 * 起こりうる。以前記事が6件消えた件も同種の競合と考えられる)。
 * 読み取り時のETagをput()のifMatchに渡す楽観的排他制御で、書き込み直前に他の更新が
 * 割り込んでいたら失敗させ、最新状態を読み直してmutateからやり直す。
 */
export async function mutateJson<T>(pathname: string, fallback: T, mutate: (data: T) => T, attempts = 5): Promise<T> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN が設定されていません。VercelダッシュボードのStorageタブでBlobを作成し、.env.localに追加してください。"
    )
  }
  for (let i = 0; i < attempts; i++) {
    const { data, etag } = await readJsonWithEtag(pathname, fallback)
    const next = mutate(data)
    try {
      await put(pathname, JSON.stringify(next, null, 2), {
        access: "public",
        contentType: "application/json",
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        ...(etag ? { ifMatch: etag } : {}),
      })
      return next
    } catch (err) {
      const isConflict = err instanceof BlobPreconditionFailedError
      if (!isConflict || i === attempts - 1) throw err
      // ETagが一致しなかった = 読み取り後に他の書き込みが入った。最新を読み直して次のループでやり直す
    }
  }
  throw new Error(`mutateJson: competing writes to ${pathname} could not be resolved after ${attempts} attempts`)
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

/** articles.jsonへの読み書きを常にこの関数経由にすることで、公開・編集・予約昇格が競合しても片方が消えない */
export async function mutateArticles(mutate: (data: ArticlesData) => ArticlesData): Promise<ArticlesData> {
  return mutateJson<ArticlesData>(ARTICLES_PATH, { articles: [], lastUpdated: new Date().toISOString() }, mutate)
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
  let updated: Article | undefined
  await mutateArticles((data) => {
    const article = data.articles.find((a) => a.id === id)
    if (!article) throw new Error(`article not found: ${id}`)
    Object.assign(article, patch, { updatedAt: new Date().toISOString() })
    data.lastUpdated = new Date().toISOString()
    updated = article
    return data
  })
  return updated!
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
  await mutateArticles((data) => {
    data.articles = data.articles.filter((a) => a.id !== article.id)
    data.articles.unshift(article)
    data.lastUpdated = new Date().toISOString()
    return data
  })
}

/** 公開済み記事を非公開にする(ハードデリートではなく除去のみ。呼び出し側でrejected draft化して残す運用) */
export async function unpublishArticle(id: string): Promise<Article> {
  let removed: Article | undefined
  await mutateArticles((data) => {
    const article = data.articles.find((a) => a.id === id)
    if (!article) throw new Error(`article not found: ${id}`)
    data.articles = data.articles.filter((a) => a.id !== id)
    data.lastUpdated = new Date().toISOString()
    removed = article
    return data
  })
  return removed!
}

// --- Drafts (収集パイプラインの出力。人間のレビュー待ち) ---

export async function readDrafts(): Promise<DraftsData> {
  return readJson<DraftsData>(DRAFTS_PATH, { drafts: [] })
}

export async function writeDrafts(data: DraftsData) {
  await writeJson(DRAFTS_PATH, data)
}

/** drafts.jsonへの読み書きを常にこの関数経由にすることで、収集・公開・削除が競合しても片方が消えない */
export async function mutateDrafts(mutate: (data: DraftsData) => DraftsData): Promise<DraftsData> {
  return mutateJson<DraftsData>(DRAFTS_PATH, { drafts: [] }, mutate)
}

export async function getPendingDrafts(): Promise<Draft[]> {
  const { drafts } = await readDrafts()
  return drafts.filter((d) => d.status === "pending").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getDraftById(id: string): Promise<Draft | undefined> {
  const { drafts } = await readDrafts()
  return drafts.find((d) => d.id === id)
}

/**
 * knownTitlesは「呼び出し時点で既に公開済みの記事タイトル」を渡すためのオプション。
 * 別々のソースURLから独立生成された下書きが、AIの出力として偶然(または同一トピックの
 * 別記事として)同じタイトルになることがあるため、URL一致だけでは防げない重複をここで防ぐ。
 * delete-selected/articles[id]のように「公開済み記事自身をrejected draftへ戻す」呼び出しでは
 * 渡さないこと(戻そうとしている記事自身のタイトルと必ず一致し、誤ってスキップされるため)。
 */
export async function addDrafts(
  newDrafts: Draft[],
  options?: { knownTitles?: Set<string> }
): Promise<{ saved: number; skipped: number }> {
  let saved = 0
  let skipped = 0
  await mutateDrafts((data) => {
    // mutateJsonはETag競合時にこのmutate関数を再実行するため、カウンタは毎回リセットする
    saved = 0
    skipped = 0
    for (const draft of newDrafts) {
      const isUrlDup = data.drafts.some((d) =>
        d.sourceRefs.some((ref) => draft.sourceRefs.some((r) => r.url === ref.url))
      )
      const isTitleDup =
        data.drafts.some((d) => d.title === draft.title) || (options?.knownTitles?.has(draft.title) ?? false)
      if (isUrlDup || isTitleDup) {
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
    return data
  })
  return { saved, skipped }
}

export async function updateDraftStatus(id: string, status: Draft["status"]) {
  await mutateDrafts((data) => {
    const draft = data.drafts.find((d) => d.id === id)
    if (draft) draft.status = status
    return data
  })
}

export async function removeDraft(id: string) {
  await mutateDrafts((data) => {
    data.drafts = data.drafts.filter((d) => d.id !== id)
    return data
  })
}

// --- Scheduled articles (公開日時が未来の記事。articles.jsonには入れず、cronが昇格させる) ---

export async function readScheduledArticles(): Promise<ScheduledArticlesData> {
  return readJson<ScheduledArticlesData>(SCHEDULED_PATH, { scheduled: [] })
}

export async function writeScheduledArticles(data: ScheduledArticlesData) {
  await writeJson(SCHEDULED_PATH, data)
}

/** scheduled.jsonへの読み書きを常にこの関数経由にすることで、複数件の一括予約や予約昇格が競合しても枠がズレない */
export async function mutateScheduledArticles(mutate: (data: ScheduledArticlesData) => ScheduledArticlesData): Promise<ScheduledArticlesData> {
  return mutateJson<ScheduledArticlesData>(SCHEDULED_PATH, { scheduled: [] }, mutate)
}

export async function getScheduledArticles(): Promise<ScheduledArticle[]> {
  const { scheduled } = await readScheduledArticles()
  return scheduled.slice().sort((a, b) => (a.scheduledPublishAt < b.scheduledPublishAt ? -1 : 1))
}

export async function addScheduledArticle(article: ScheduledArticle) {
  await mutateScheduledArticles((data) => {
    data.scheduled = data.scheduled.filter((a) => a.id !== article.id)
    data.scheduled.push(article)
    return data
  })
}

export async function removeScheduledArticle(id: string) {
  await mutateScheduledArticles((data) => {
    data.scheduled = data.scheduled.filter((a) => a.id !== id)
    return data
  })
}

/**
 * scheduledPublishAtを過ぎた予約記事をarticles.jsonへ昇格させる(publishedAt=scheduledPublishAt)。
 * 「due一覧の確定」はここで1回だけ読んで決めるが、articles.jsonへの追加・scheduled.jsonからの除去は
 * それぞれmutateJsonで保護し、かつ両方とも記事ID/該当ID基準の冪等な操作にしている
 * (同一IDの記事を複数回追加しても重複しない・同一IDの削除を複数回行っても副作用は同じ)ため、
 * 万一この関数が短時間に重複実行されても、articles反映後にscheduled除去が失敗するケース以外は
 * 安全に収束する(その場合も次回実行時にarticles側が冪等なので再度届く)。
 */
export async function promoteDueScheduledArticles(): Promise<{ promoted: number; titles: string[] }> {
  const { scheduled } = await readScheduledArticles()
  const now = Date.now()
  const due = scheduled.filter((a) => new Date(a.scheduledPublishAt).getTime() <= now)
  if (due.length === 0) return { promoted: 0, titles: [] }

  await mutateArticles((articlesData) => {
    for (const item of due) {
      const { scheduledPublishAt, ...rest } = item
      const article: Article = { ...rest, publishedAt: scheduledPublishAt }
      articlesData.articles = articlesData.articles.filter((a) => a.id !== article.id)
      articlesData.articles.unshift(article)
    }
    articlesData.lastUpdated = new Date().toISOString()
    return articlesData
  })

  await mutateScheduledArticles((scheduledData) => {
    scheduledData.scheduled = scheduledData.scheduled.filter((a) => !due.some((d) => d.id === a.id))
    return scheduledData
  })

  return { promoted: due.length, titles: due.map((a) => a.title) }
}
