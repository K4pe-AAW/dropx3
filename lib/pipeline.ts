import { collectFromRss } from "./collector"
import { draftFromRawItems } from "./ai-draft"
import { addDrafts, readDrafts } from "./storage"

export type CollectSummary = {
  fetched: number
  drafted: number
  skipped: number
  errors: string[]
}

/**
 * RSS収集 -> 既存下書きとの重複除外 -> AIによる下書き生成 -> 保存、まで一括で行う。
 * 自動公開はしない（drafts.jsonに入るだけ）。app/admin でレビュー・公開する。
 */
export async function runCollectAndDraft(): Promise<CollectSummary> {
  const { items, errors: collectErrors } = await collectFromRss()

  const existingDrafts = readDrafts().drafts
  const existingUrls = new Set(existingDrafts.flatMap((d) => d.sourceRefs.map((r) => r.url)))
  const targets = items.filter((item) => !existingUrls.has(item.sourceUrl))

  const { drafts, errors: draftErrors } = await draftFromRawItems(targets)
  const { saved, skipped } = addDrafts(drafts)

  return {
    fetched: items.length,
    drafted: saved,
    skipped,
    errors: [...collectErrors, ...draftErrors],
  }
}
