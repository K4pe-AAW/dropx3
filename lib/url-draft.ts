import { RawItem, Draft } from "./types"
import { generateId, readDrafts, getAllArticles, addDrafts } from "./storage"
import { draftFromRawItem } from "./ai-draft"
import { isSafeExternalUrl } from "./affiliate"
import { fetchPageText, BODY_TEXT_LIMIT } from "./source-watch/fetchers/html"
import { prioritizeProductFacts } from "./product-fact-evidence"

async function assertUrlNotAlreadyDrafted(url: string): Promise<void> {
  const [existingDrafts, existingArticles] = await Promise.all([readDrafts(), getAllArticles()])
  const alreadyExists = [
    // dismissedSourceUrlsは意図的に含めない。人間がURLを直接入力した場合だけ再生成を許可する。
    ...existingDrafts.drafts.flatMap((d) => d.sourceRefs),
    ...existingArticles.flatMap((a) => a.sourceRefs),
  ].some((ref) => ref.url === url)
  if (alreadyExists) throw new Error("このURLからは既に下書きまたは記事が作成済みです")
}

async function generateAndSaveDraft(item: RawItem): Promise<Draft> {
  const draft = await draftFromRawItem(item)
  const { saved } = await addDrafts([draft], { allowDismissedUrlRevival: true })
  if (saved === 0) throw new Error("似たタイトルの下書き・記事が既に存在するため保存をスキップしました")
  return draft
}

/**
 * RSS収集を待たず、1本のURLを貼っただけでその場でAI下書きを生成する(SmartQueueと違い
 * 巡回対象に登録する必要がない、見つけた記事をすぐ下書き化するための経路)。
 * 自動公開はしない — addDrafts()で保存するだけで、公開はこれまで通り人間がPublishFormで行う。
 */
export async function draftFromUrl(url: string): Promise<Draft> {
  if (!isSafeExternalUrl(url)) throw new Error("URLの形式が正しくありません")
  await assertUrlNotAlreadyDrafted(url)

  const page = await fetchPageText(url)
  if (!page.title) {
    throw new Error(
      page.failureReason
        ? `記事の取得に失敗しました。${page.failureReason}。本文を直接貼り付けて生成することもできます。`
        : "記事の取得に失敗しました(タイトルを読み取れませんでした)。本文を直接貼り付けて生成することもできます。"
    )
  }

  return generateAndSaveDraft({
    id: generateId(url),
    sourceName: new URL(url).hostname,
    sourceUrl: url,
    title: page.title,
    snippet: page.text,
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    imageCandidates: page.imageCandidates,
    commerceLinkCandidates: page.commerceLinkCandidates,
  })
}

/**
 * arknets.co.jp等、Bot対策(WAF Challengeなど)でサーバー側からの自動取得ができないサイト向けの
 * 代替経路。人間が自分のブラウザで見えているページの本文をコピーして貼り付けることで、
 * fetchPageTextを経由せずAI下書き生成(draftFromRawItem)だけを行う。
 */
export async function draftFromPastedText(url: string, title: string, pastedText: string): Promise<Draft> {
  if (!isSafeExternalUrl(url)) throw new Error("URLの形式が正しくありません")
  if (!title.trim()) throw new Error("タイトルを入力してください")
  if (!pastedText.trim()) throw new Error("本文を貼り付けてください")
  await assertUrlNotAlreadyDrafted(url)

  const commerceLinkCandidates = [...pastedText.matchAll(/https?:\/\/[^\s<>()\[\]"']+/g)]
    .map((match) => match[0].replace(/[。、，,.!?！？]+$/, ""))
    .filter((candidate, index, all) => all.indexOf(candidate) === index)
    .slice(0, 30)
    .map((candidate) => ({ label: new URL(candidate).hostname, url: candidate }))
  const imageCandidates = commerceLinkCandidates
    .map((candidate) => candidate.url)
    .filter((candidate) => /\.(?:avif|gif|jpe?g|png|webp)(?:\?|$)/i.test(candidate))
    .slice(0, 8)

  return generateAndSaveDraft({
    id: generateId(url),
    sourceName: new URL(url).hostname,
    sourceUrl: url,
    title: title.trim(),
    // URL取得と同じく、長い貼り付け本文の後半にある価格・発売日を先頭へ移してから上限を適用する。
    snippet: prioritizeProductFacts(pastedText.trim(), BODY_TEXT_LIMIT),
    commerceLinkCandidates,
    imageCandidates,
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
  })
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
