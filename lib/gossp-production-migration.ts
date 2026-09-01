import type { ArticlesData, DraftsData, ScheduledArticlesData } from "./types"
import {
  ARTICLES_PATH,
  DRAFTS_PATH,
  SCHEDULED_PATH,
  mutateArticles,
  mutateDrafts,
  mutateJson,
  readJson,
  writeJson,
} from "./storage"
import { convertRumorToGossp } from "./gossp-migration"

type DatasetResult = {
  path: string
  replacements: number
  backupPath: string | null
}

export async function migrateProductionContentToGossp(): Promise<{
  replacements: number
  datasets: DatasetResult[]
}> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const datasets: DatasetResult[] = []

  const articlesBefore = await readJson<ArticlesData>(ARTICLES_PATH, { articles: [], lastUpdated: new Date().toISOString() })
  const articlesPreview = convertRumorToGossp(articlesBefore)
  const articlesBackup = articlesPreview.replacements > 0
    ? `backups/gossp-migration-${timestamp}/articles.json`
    : null
  if (articlesBackup) await writeJson(articlesBackup, articlesBefore)
  let articleReplacements = 0
  if (articlesPreview.replacements > 0) {
    await mutateArticles((data) => {
      const converted = convertRumorToGossp(data)
      articleReplacements = converted.replacements
      converted.value.lastUpdated = new Date().toISOString()
      return converted.value
    })
  }
  datasets.push({ path: ARTICLES_PATH, replacements: articleReplacements, backupPath: articlesBackup })

  const draftsBefore = await readJson<DraftsData>(DRAFTS_PATH, { drafts: [] })
  const draftsPreview = convertRumorToGossp(draftsBefore)
  const draftsBackup = draftsPreview.replacements > 0
    ? `backups/gossp-migration-${timestamp}/drafts.json`
    : null
  if (draftsBackup) await writeJson(draftsBackup, draftsBefore)
  let draftReplacements = 0
  if (draftsPreview.replacements > 0) {
    await mutateDrafts((data) => {
      const converted = convertRumorToGossp(data)
      draftReplacements = converted.replacements
      return converted.value
    })
  }
  datasets.push({ path: DRAFTS_PATH, replacements: draftReplacements, backupPath: draftsBackup })

  const scheduledBefore = await readJson<ScheduledArticlesData>(SCHEDULED_PATH, { scheduled: [] })
  const scheduledPreview = convertRumorToGossp(scheduledBefore)
  const scheduledBackup = scheduledPreview.replacements > 0
    ? `backups/gossp-migration-${timestamp}/scheduled.json`
    : null
  if (scheduledBackup) await writeJson(scheduledBackup, scheduledBefore)
  let scheduledReplacements = 0
  if (scheduledPreview.replacements > 0) {
    await mutateJson<ScheduledArticlesData>(SCHEDULED_PATH, { scheduled: [] }, (data) => {
      const converted = convertRumorToGossp(data)
      scheduledReplacements = converted.replacements
      return converted.value
    })
  }
  datasets.push({ path: SCHEDULED_PATH, replacements: scheduledReplacements, backupPath: scheduledBackup })

  return {
    replacements: datasets.reduce((sum, dataset) => sum + dataset.replacements, 0),
    datasets,
  }
}
