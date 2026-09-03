import { NextResponse } from "next/server"
import { normalizeGosspLabel } from "@/lib/gossp-migration"
import {
  mutateArticles,
  mutateDrafts,
  mutateScheduledArticles,
  readArticles,
  readDrafts,
  readScheduledArticles,
  writeJson,
} from "@/lib/storage"

/** 旧表記「Gossp!」を意図した「Goss!p」へ一度だけ正規化する管理用移行。 */
export async function POST() {
  const [articlesBefore, draftsBefore, scheduledBefore] = await Promise.all([
    readArticles(),
    readDrafts(),
    readScheduledArticles(),
  ])

  const backupId = new Date().toISOString().replace(/[:.]/g, "-")
  await Promise.all([
    writeJson(`data/backups/gossp-label-${backupId}-articles.json`, articlesBefore),
    writeJson(`data/backups/gossp-label-${backupId}-drafts.json`, draftsBefore),
    writeJson(`data/backups/gossp-label-${backupId}-scheduled.json`, scheduledBefore),
  ])

  let articleReplacements = 0
  let draftReplacements = 0
  let scheduledReplacements = 0

  await mutateArticles((data) => {
    const converted = normalizeGosspLabel(data)
    articleReplacements = converted.replacements
    if (converted.replacements > 0) converted.value.lastUpdated = new Date().toISOString()
    return converted.value
  })
  await mutateDrafts((data) => {
    const converted = normalizeGosspLabel(data)
    draftReplacements = converted.replacements
    return converted.value
  })
  await mutateScheduledArticles((data) => {
    const converted = normalizeGosspLabel(data)
    scheduledReplacements = converted.replacements
    return converted.value
  })

  return NextResponse.json({
    replacements: {
      articles: articleReplacements,
      drafts: draftReplacements,
      scheduled: scheduledReplacements,
      total: articleReplacements + draftReplacements + scheduledReplacements,
    },
    backupId,
  })
}
