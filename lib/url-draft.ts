import { RawItem, Draft } from "./types"
import { generateId, readDrafts, getAllArticles, addDrafts } from "./storage"
import { draftFromRawItem } from "./ai-draft"
import { isSafeExternalUrl } from "./affiliate"
import { fetchPageText } from "./source-watch/fetchers/html"

/**
 * RSS収集を待たず、1本のURLを貼っただけでその場でAI下書きを生成する(SmartQueueと違い
 * 巡回対象に登録する必要がない、見つけた記事をすぐ下書き化するための経路)。
 * 自動公開はしない — addDrafts()で保存するだけで、公開はこれまで通り人間がPublishFormで行う。
 */
export async function draftFromUrl(url: string): Promise<Draft> {
  if (!isSafeExternalUrl(url)) throw new Error("URLの形式が正しくありません")

  const [existingDrafts, existingArticles] = await Promise.all([readDrafts(), getAllArticles()])
  const alreadyExists = [
    ...existingDrafts.drafts.flatMap((d) => d.sourceRefs),
    ...existingArticles.flatMap((a) => a.sourceRefs),
  ].some((ref) => ref.url === url)
  if (alreadyExists) throw new Error("このURLからは既に下書きまたは記事が作成済みです")

  const page = await fetchPageText(url)
  if (!page?.title) throw new Error("記事の取得に失敗しました(タイトルを読み取れませんでした)")

  const item: RawItem = {
    id: generateId(url),
    sourceName: new URL(url).hostname,
    sourceUrl: url,
    title: page.title,
    snippet: page.text,
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    imageCandidates: page.imageCandidates,
  }

  const draft = await draftFromRawItem(item)
  const { saved } = await addDrafts([draft])
  if (saved === 0) throw new Error("似たタイトルの下書き・記事が既に存在するため保存をスキップしました")
  return draft
}

export type UrlDraftBatchResult = { url: string; draft?: Draft; error?: string }

/** 1回のリクエストで一気に生成しすぎるとVercelの実行時間上限に当たるため、件数を絞る */
const MAX_URLS_PER_BATCH = 6
/** OpenAIのレート制限と、失敗した1件が全体を巻き込まないことのバランスを取る(draftFromRawItemsと同じ考え方) */
const BATCH_CONCURRENCY = 3

/**
 * 複数URLを一括で下書き化する(URLから記事を生成の複数貼り付け対応)。1件の失敗が他を
 * 巻き込まないよう、Promise.allSettledで独立に処理しURLごとの成否を返す。
 */
export async function draftsFromUrls(urls: string[]): Promise<UrlDraftBatchResult[]> {
  const targets = urls.slice(0, MAX_URLS_PER_BATCH)
  const results: UrlDraftBatchResult[] = []
  for (let i = 0; i < targets.length; i += BATCH_CONCURRENCY) {
    const batch = targets.slice(i, i + BATCH_CONCURRENCY)
    const settled = await Promise.allSettled(batch.map((url) => draftFromUrl(url)))
    settled.forEach((r, idx) => {
      const url = batch[idx]
      results.push(
        r.status === "fulfilled"
          ? { url, draft: r.value }
          : { url, error: r.reason instanceof Error ? r.reason.message : String(r.reason) }
      )
    })
  }
  return results
}
