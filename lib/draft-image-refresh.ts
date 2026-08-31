import { canonicalImageKey, selectProductImageCandidates } from "./image-candidates"
import { fetchPageText } from "./source-watch/fetchers/html"
import { mutateDrafts, readDrafts, writeJson } from "./storage"
import type { Draft, GalleryImage } from "./types"

type ImageUpdate = { cover?: string; gallery: GalleryImage[]; sourceUrl?: string }

function isUpToDate(draft: Draft): boolean {
  return draft.sourceRefs.some((ref) => ref.name.replace(/[^a-z0-9]/gi, "").toUpperCase() === "UPTODATE")
}

function orderedSourceUrls(draft: Draft): string[] {
  const refs = [...draft.sourceRefs].sort((a, b) => {
    const aPriority = a.name.replace(/[^a-z0-9]/gi, "").toUpperCase() === "UPTODATE" ? 0 : 1
    const bPriority = b.name.replace(/[^a-z0-9]/gi, "").toUpperCase() === "UPTODATE" ? 0 : 1
    return aPriority - bPriority
  })
  return [...new Set([...refs.map((ref) => ref.url), ...(draft.suggestedOfficialLinks ?? []).map((link) => link.url)])]
    .filter((url) => /^https?:\/\//i.test(url) && !/(?:youtube\.com|youtu\.be)/i.test(url))
}

function existingImages(draft: Draft): string[] {
  return [draft.suggestedCoverImage, ...(draft.suggestedGalleryImages ?? []).map((image) => image.url)]
    .filter((url): url is string => Boolean(url))
}

async function collectForDraft(draft: Draft): Promise<ImageUpdate> {
  for (const sourceUrl of orderedSourceUrls(draft)) {
    const page = await fetchPageText(sourceUrl)
    const selected = selectProductImageCandidates(page.imageCandidates, 8)
    if (selected.length > 0) {
      return {
        cover: selected[0],
        gallery: selected.slice(1).map((url) => ({ url, alt: draft.title })),
        sourceUrl,
      }
    }
  }

  const selected = selectProductImageCandidates(existingImages(draft), 8)
  return {
    ...(selected[0] ? { cover: selected[0] } : {}),
    gallery: selected.slice(1).map((url) => ({ url, alt: draft.title })),
  }
}

function freshness(draft: Draft): number {
  return new Date(draft.sourcePublishedAt ?? draft.createdAt).getTime()
}

export type DraftImageRefreshOptions = {
  offset?: number
  limit?: number
}

export async function refreshAllDraftImages(options: DraftImageRefreshOptions = {}) {
  const before = await readDrafts()
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = `backups/draft-image-refresh-${timestamp}/drafts.json`
  await writeJson(backupPath, before)

  const allTargets = before.drafts.filter((draft) => !draft.suggestedYoutubeVideoId)
  const offset = Math.max(0, Math.floor(options.offset ?? 0))
  const limit = options.limit === undefined ? allTargets.length : Math.max(1, Math.min(50, Math.floor(options.limit)))
  const targets = allTargets.slice(offset, offset + limit)
  const updates = new Map<string, ImageUpdate>()
  const failures: { id: string; title: string; reason: string }[] = []
  const concurrency = 4

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency)
    const results = await Promise.allSettled(batch.map((draft) => collectForDraft(draft)))
    results.forEach((result, index) => {
      const draft = batch[index]
      if (result.status === "fulfilled") updates.set(draft.id, result.value)
      else failures.push({
        id: draft.id,
        title: draft.title,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
    })
  }

  let updated = 0
  let coversAdded = 0
  let galleriesRemoved = 0
  let duplicateImagesCleared = 0
  await mutateDrafts((data) => {
    for (const draft of data.drafts) {
      const update = updates.get(draft.id)
      if (!update) continue
      const previousCover = draft.suggestedCoverImage
      const previousGalleryCount = draft.suggestedGalleryImages?.length ?? 0
      if (update.cover) draft.suggestedCoverImage = update.cover
      else delete draft.suggestedCoverImage
      if (update.gallery.length > 0) draft.suggestedGalleryImages = update.gallery
      else delete draft.suggestedGalleryImages
      if (!previousCover && update.cover) coversAdded++
      galleriesRemoved += Math.max(0, previousGalleryCount - update.gallery.length)
      if (previousCover !== update.cover || previousGalleryCount !== update.gallery.length) updated++
    }

    const owners = new Map<string, Draft>()
    for (const draft of data.drafts.filter((item) => item.suggestedCoverImage)) {
      const key = canonicalImageKey(draft.suggestedCoverImage!)
      const current = owners.get(key)
      if (!current) {
        owners.set(key, draft)
        continue
      }
      const winner = isUpToDate(draft) !== isUpToDate(current)
        ? (isUpToDate(draft) ? draft : current)
        : (freshness(draft) > freshness(current) ? draft : current)
      const loser = winner.id === draft.id ? current : draft
      delete loser.suggestedCoverImage
      delete loser.suggestedGalleryImages
      duplicateImagesCleared++
      owners.set(key, winner)
    }
    return data
  })

  return {
    totalDrafts: before.drafts.length,
    totalTargets: allTargets.length,
    offset,
    processed: targets.length,
    nextOffset: offset + targets.length < allTargets.length ? offset + targets.length : null,
    targets: targets.length,
    updated,
    coversAdded,
    galleriesRemoved,
    duplicateImagesCleared,
    failures: failures.length,
    failureDetails: failures,
    backupPath,
  }
}
