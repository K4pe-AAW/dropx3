import { isSafeExternalUrl } from "@/lib/affiliate"
import { canonicalImageKey } from "@/lib/image-candidates"
import type { Article, SnapItem, SnapProfile } from "@/lib/types"

export function sanitizeSnapProfile(input: unknown): SnapProfile | undefined {
  if (typeof input !== "object" || input === null) return undefined
  const value = input as Record<string, unknown>
  const items: SnapItem[] = Array.isArray(value.items)
    ? value.items
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          brand: typeof item.brand === "string" ? item.brand.trim() : "",
          itemName: typeof item.itemName === "string" ? item.itemName.trim() : "",
          ...(typeof item.category === "string" && item.category.trim() ? { category: item.category.trim() } : {}),
          ...(typeof item.note === "string" && item.note.trim() ? { note: item.note.trim() } : {}),
        }))
        .filter((item) => item.brand || item.itemName)
    : []
  const instagramUrl = typeof value.instagramUrl === "string" ? value.instagramUrl.trim() : ""
  return {
    displayName: typeof value.displayName === "string" ? value.displayName.trim() : "",
    ...(typeof value.ageGroup === "string" && value.ageGroup.trim() ? { ageGroup: value.ageGroup.trim() } : {}),
    ...(typeof value.occupation === "string" && value.occupation.trim() ? { occupation: value.occupation.trim() } : {}),
    ...(typeof value.location === "string" && value.location.trim() ? { location: value.location.trim() } : {}),
    stylePoint: typeof value.stylePoint === "string" ? value.stylePoint.trim() : "",
    ...(instagramUrl && isSafeExternalUrl(instagramUrl) ? { instagramUrl } : {}),
    consentConfirmed: value.consentConfirmed === true,
    ...(typeof value.consentConfirmedAt === "string" && value.consentConfirmedAt.trim()
      ? { consentConfirmedAt: value.consentConfirmedAt.trim() }
      : {}),
    items,
  }
}

export function validateSnapProfile(profile: SnapProfile | undefined): string | undefined {
  if (!profile?.displayName) return "SNAPの名前・ニックネームは必須です"
  if (!profile.stylePoint) return "SNAPの今日のポイントは必須です"
  if (!profile.consentConfirmed) return "撮影・掲載同意の確認が必要です"
  return undefined
}

export function findDuplicateSnap(articles: Article[], coverImage: string, profile: SnapProfile): Article | undefined {
  const imageKey = canonicalImageKey(coverImage)
  const location = profile.location?.toLocaleLowerCase()
  return articles.find((article) => {
    if (article.contentType !== "SNAP" || !article.snapProfile) return false
    if (canonicalImageKey(article.coverImage) === imageKey) return true
    return (
      article.snapProfile.displayName.toLocaleLowerCase() === profile.displayName.toLocaleLowerCase() &&
      Boolean(location) &&
      article.snapProfile.location?.toLocaleLowerCase() === location
    )
  })
}

export function matchesSnapFilter(article: Article, brand: string, item: string): boolean {
  if (article.contentType !== "SNAP") return false
  const brandNeedle = brand.trim().toLocaleLowerCase()
  const itemNeedle = item.trim().toLocaleLowerCase()
  const items = article.snapProfile?.items ?? []
  const brandMatch = !brandNeedle || article.brands.some((v) => v.toLocaleLowerCase().includes(brandNeedle)) || items.some((v) => v.brand.toLocaleLowerCase().includes(brandNeedle))
  const itemMatch = !itemNeedle || items.some((v) => `${v.category ?? ""} ${v.itemName} ${v.note ?? ""}`.toLocaleLowerCase().includes(itemNeedle))
  return brandMatch && itemMatch
}
