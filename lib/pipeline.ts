import { collectFromRss } from "./collector"
import { draftFromRawItems } from "./ai-draft"
import { addDrafts, readDrafts, getAllArticles } from "./storage"

export type CollectSummary = {
  fetched: number
  drafted: number
  skipped: number
  errors: string[]
}

/**
 * 1回の巡回でAI下書き生成にかける件数の上限(コスト暴走の安全弁)。
 * cronを6時間おきにしたことで、長期間の停止明けや複数媒体で同時に新着が出た場合に
 * 想定より多い件数が一度に生成される可能性があるため、超過分は次回の巡回(重複排除は
 * sourceUrl単位なので取りこぼさない)に自然に持ち越す。
 */
const MAX_DRAFTS_PER_RUN = 20

/**
 * RSS収集 -> 既存下書き・公開済み記事との重複除外 -> AIによる下書き生成 -> 保存、まで一括で行う。
 * 自動公開はしない（drafts.jsonに入るだけ）。app/admin でレビュー・公開する。
 */
export async function runCollectAndDraft(): Promise<CollectSummary> {
  const { items, errors: collectErrors } = await collectFromRss()

  // 下書きは公開されるとdrafts.jsonから消えるため、下書きのURLだけを見ていると
  // 「一度公開された記事のソースURLが後日また新着として現れ、二重に下書き化される」
  // という抜け道が生まれる。公開済み記事(articles.json)のsourceRefsも合わせてチェックする。
  const [existingDrafts, existingArticles] = await Promise.all([readDrafts(), getAllArticles()])
  const existingUrls = new Set([
    ...existingDrafts.drafts.flatMap((d) => d.sourceRefs.map((r) => r.url)),
    ...(existingDrafts.dismissedSourceUrls ?? []),
    ...existingArticles.flatMap((a) => a.sourceRefs.map((r) => r.url)),
  ])
  const targets = items.filter((item) => !existingUrls.has(item.sourceUrl)).slice(0, MAX_DRAFTS_PER_RUN)

  const { drafts, errors: draftErrors } = await draftFromRawItems(targets)
  // URLが別々でもAIが独立生成したタイトルが偶然一致するケース(同じニュースを複数媒体が
  // 別々に配信した場合等)があるため、公開済み記事のタイトルとも突き合わせて弾く
  const knownTitles = new Set(existingArticles.map((a) => a.title))
  const { saved, skipped } = await addDrafts(drafts, { knownTitles })

  return {
    fetched: items.length,
    drafted: saved,
    skipped,
    errors: [...collectErrors, ...draftErrors],
  }
}
