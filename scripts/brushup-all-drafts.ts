import { canonicalImageKey } from "../lib/image-candidates"
import { brushUpDraftWithUrl } from "../lib/draft-brushup"
import { isSafeExternalUrl } from "../lib/affiliate"
import { mutateDrafts, readDrafts, writeJson } from "../lib/storage"
import type { Draft, GalleryImage, PurchaseChannelInfo } from "../lib/types"

const LOTTERY_PATTERN = /抽選|応募|raffle|lottery|entry/i

function sourceUrlOf(draft: Draft): string | null {
  const urls = [
    ...(draft.suggestedOfficialLinks ?? []).map((link) => link.url),
    ...draft.sourceRefs.map((ref) => ref.url),
  ]
  return urls.find((url) => isSafeExternalUrl(url) && !/(?:youtube\.com|youtu\.be)/i.test(url)) ?? null
}

function mergeImages(draft: Draft, candidates: string[]): Pick<Draft, "suggestedCoverImage" | "suggestedGalleryImages"> {
  const urls = [draft.suggestedCoverImage, ...(draft.suggestedGalleryImages ?? []).map((image) => image.url)]
    .filter((url): url is string => Boolean(url))
  const seen = new Set(urls.map(canonicalImageKey))
  const added = candidates.filter((url) => {
    const key = canonicalImageKey(url)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  const cover = draft.suggestedCoverImage ?? added.shift()
  const gallery: GalleryImage[] = [
    ...(draft.suggestedGalleryImages ?? []),
    ...added.map((url) => ({ url, alt: draft.title, credit: "" })),
  ].slice(0, 12)
  return {
    ...(cover ? { suggestedCoverImage: cover } : {}),
    ...(gallery.length > 0 ? { suggestedGalleryImages: gallery } : {}),
  }
}

function mergePurchaseChannels(
  current: PurchaseChannelInfo[],
  candidates: { label: string; url: string }[]
): PurchaseChannelInfo[] {
  const fresh: PurchaseChannelInfo[] = candidates.map(({ label, url }) => ({
    retailerName: label || new URL(url).hostname,
    channelType: "official",
    saleMethod: LOTTERY_PATTERN.test(`${label} ${url}`) ? "lottery" : "regular",
    url,
  }))
  const merged = [...fresh, ...current]
  return merged.filter((item, index) => {
    const key = item.url || `${item.retailerName}:${item.saleMethod}`
    return merged.findIndex((other) => (other.url || `${other.retailerName}:${other.saleMethod}`) === key) === index
  })
}

export async function runBulkBrushup(options: { offset?: number; limit?: number; backup?: boolean } = {}) {
  const before = await readDrafts()
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = options.backup === false ? null : `backups/manual-brushup-${timestamp}/drafts.json`
  if (backupPath) await writeJson(backupPath, before)

  const allTargets = before.drafts.filter((draft) => !draft.suggestedYoutubeVideoId)
  const offset = Math.max(0, options.offset ?? 0)
  const targets = allTargets.slice(offset, options.limit ? offset + options.limit : undefined)
  let updated = 0
  const failed: { id: string; title: string; reason: string }[] = []

  console.log(JSON.stringify({ event: "start", totalDrafts: before.drafts.length, allTargets: allTargets.length, offset, targets: targets.length, backupPath }))
  for (const [index, draft] of targets.entries()) {
    const sourceUrl = sourceUrlOf(draft)
    if (!sourceUrl) {
      failed.push({ id: draft.id, title: draft.title, reason: "参照可能な非YouTube URLなし" })
      continue
    }
    try {
      const result = await brushUpDraftWithUrl(
        {
          title: draft.title,
          excerpt: draft.excerpt,
          bodyParagraphs: draft.bodyParagraphs,
          colorways: draft.suggestedColorways ?? [],
        },
        sourceUrl
      )
      await mutateDrafts((data) => {
        const target = data.drafts.find((item) => item.id === draft.id)
        if (!target) return data
        const images = mergeImages(target, result.imageCandidates)
        target.title = result.title
        target.excerpt = result.excerpt
        target.bodyParagraphs = result.bodyParagraphs
        if (result.colorways.length > 0) target.suggestedColorways = result.colorways
        Object.assign(target, images)
        target.suggestedPurchaseChannels = mergePurchaseChannels(
          target.suggestedPurchaseChannels ?? [],
          result.commerceLinkCandidates
        )
        if (!target.sourceRefs.some((ref) => ref.url === result.sourceRef.url)) target.sourceRefs.push(result.sourceRef)
        return data
      })
      updated++
      console.log(JSON.stringify({ event: "updated", index: index + 1, total: targets.length, id: draft.id, title: result.title }))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      failed.push({ id: draft.id, title: draft.title, reason })
      console.log(JSON.stringify({ event: "failed", index: index + 1, total: targets.length, id: draft.id, reason }))
    }
  }

  const summary = { totalDrafts: before.drafts.length, allTargets: allTargets.length, offset, targets: targets.length, updated, failed: failed.length, backupPath, failures: failed }
  console.log(JSON.stringify({ event: "complete", ...summary }))
  return summary
}

if (process.env.RUN_BULK_BRUSHUP === "1") {
  runBulkBrushup().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
