import { imageStatusOf, isImageAutoUsable, type ImageStatusLevel } from "./image-rights"
import { bestImageGrade, type ImageQualityGrade } from "./image-quality"
import { listImageAssets, listSourceLinks, listSources } from "./storage"
import type { ImageAsset, Product, ProductReadiness, Source, SourceCategory, SourceLink } from "./types"

export type ImageStatusSummary = {
  level: ImageStatusLevel | "none"
  usableCount: number
  reviewCount: number
  totalCount: number
  bestGrade: ImageQualityGrade | null
}

/** カードで「不足」として提示する項目。表示ラベル・アクション文言はクライアント側(components)が持つ */
export type MissingFacet = "official" | "domestic" | "image" | "purchase"

export type ProductCard = {
  product: Product
  sourceNames: string[]
  sourceBadges: { name: string; category: SourceCategory | null }[]
  sourceLinks: SourceLink[]
  /** officialConfirmedの根拠になった一次情報リンク(INFORMATION表示用。無ければnull) */
  officialSourceLink: SourceLink | null
  images: ImageAsset[]
  /** 一覧サムネイル用。自動使用可能な画像の先頭(draft-builder.tsの選択基準と同じ) */
  coverImage: ImageAsset | null
  imageStatus: ImageStatusSummary
  hasNonBrandTopPurchaseLink: boolean
  missingFacets: MissingFacet[]
}

function computeImageStatus(images: ImageAsset[]): ImageStatusSummary {
  if (images.length === 0) return { level: "none", usableCount: 0, reviewCount: 0, totalCount: 0, bestGrade: null }

  const levels = images.map((a) => imageStatusOf(a))
  const usableCount = levels.filter((l) => l === "usable").length
  const reviewCount = levels.filter((l) => l === "review").length
  const embedCount = levels.filter((l) => l === "embed_only").length

  let level: ImageStatusLevel = "unusable"
  if (usableCount > 0) level = "usable"
  else if (embedCount > 0) level = "embed_only"
  else if (reviewCount > 0) level = "review"

  return { level, usableCount, reviewCount, totalCount: images.length, bestGrade: bestImageGrade(images) }
}

const CONFIRMED_LINK_TYPES: SourceLink["type"][] = ["official_news", "official_product", "official_social", "press_release", "retailer"]

export function computeMissingFacets(input: {
  product: Pick<Product, "officialConfirmed" | "domesticConfirmed">
  imageStatus: Pick<ImageStatusSummary, "level">
  hasNonBrandTopPurchaseLink: boolean
}): MissingFacet[] {
  const facets: MissingFacet[] = []
  if (!input.product.officialConfirmed) facets.push("official")
  if (!input.product.domesticConfirmed) facets.push("domestic")
  if (input.imageStatus.level !== "usable") facets.push("image")
  if (!input.hasNonBrandTopPurchaseLink) facets.push("purchase")
  return facets
}

/** 管理画面のカード表示に必要な情報をProductへ結合する(N+1にならないよう一括取得したデータを渡す) */
export function toProductCard(product: Product, allSourceLinks: SourceLink[], allImageAssets: ImageAsset[], allSources: Source[] = []): ProductCard {
  const sourceLinks = allSourceLinks.filter((l) => product.sourceLinkIds.includes(l.id))
  const images = allImageAssets.filter((a) => product.imageAssetIds.includes(a.id))
  const sourcesByName = new Map(allSources.map((s) => [s.name, s]))

  const imageStatus = computeImageStatus(images)
  const coverImage = images.find((a) => isImageAutoUsable(a)) ?? null
  const hasNonBrandTopPurchaseLink = product.purchaseLinkCandidates.some((c) => !c.isBrandTopOnly)

  return {
    product,
    sourceNames: [...new Set(sourceLinks.map((l) => l.publisher))],
    sourceBadges: [...new Set(sourceLinks.map((l) => l.publisher))].map((name) => ({
      name,
      category: sourcesByName.get(name)?.category ?? null,
    })),
    sourceLinks,
    officialSourceLink: sourceLinks.find((l) => CONFIRMED_LINK_TYPES.includes(l.type)) ?? null,
    images,
    coverImage,
    imageStatus,
    hasNonBrandTopPurchaseLink,
    missingFacets: computeMissingFacets({ product, imageStatus, hasNonBrandTopPurchaseLink }),
  }
}

export async function listProductCards(products: Product[]): Promise<ProductCard[]> {
  const allSourceLinkIds = [...new Set(products.flatMap((p) => p.sourceLinkIds))]
  const allImageAssetIds = [...new Set(products.flatMap((p) => p.imageAssetIds))]
  const [sourceLinks, imageAssets, sources] = await Promise.all([
    listSourceLinks(allSourceLinkIds),
    listImageAssets(allImageAssetIds),
    listSources(),
  ])
  return products.map((p) => toProductCard(p, sourceLinks, imageAssets, sources))
}

const READINESS_ORDER: Record<ProductReadiness, number> = { READY: 0, REVIEW: 1, HOLD: 2 }

/**
 * 「今対応すれば記事公開に最も近いもの」順。READY→不足の少ないREVIEW→不足の多いREVIEW→HOLDの順に並べ、
 * 同順位はSource Score(信頼度)の高い順、次に発売日が近い順(不明は後ろ)、最後に検出が新しい順。
 * 「話題性」は実データとして存在しないため使わない(捏造しない)。
 */
export function sortCardsByPriority(cards: ProductCard[]): ProductCard[] {
  return [...cards].sort((a, b) => {
    const orderA = READINESS_ORDER[a.product.readiness]
    const orderB = READINESS_ORDER[b.product.readiness]
    if (orderA !== orderB) return orderA - orderB

    const missingA = a.missingFacets.length
    const missingB = b.missingFacets.length
    if (missingA !== missingB) return missingA - missingB

    if (a.product.sourceScore !== b.product.sourceScore) return b.product.sourceScore - a.product.sourceScore

    const releaseA = a.product.colorways.find((c) => c.releaseDate)?.releaseDate
    const releaseB = b.product.colorways.find((c) => c.releaseDate)?.releaseDate
    if (releaseA && releaseB && releaseA !== releaseB) return releaseA < releaseB ? -1 : 1
    if (releaseA && !releaseB) return -1
    if (!releaseA && releaseB) return 1

    return a.product.firstDetectedAt < b.product.firstDetectedAt ? 1 : -1
  })
}

export async function findOfficialSourcesForBrand(brand: string | null): Promise<Source[]> {
  if (!brand) return []
  const sources = await listSources()
  const needle = brand.toLowerCase()
  return sources.filter(
    (s) => s.category === "official" && s.url && (s.name.toLowerCase().includes(needle) || s.id.includes(needle))
  )
}
