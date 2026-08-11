import { isImageAutoUsable } from "./image-rights"
import { listImageAssets, listSourceLinks, listSources } from "./storage"
import type { ImageAsset, Product, Source, SourceLink } from "./types"

export type ProductCard = {
  product: Product
  sourceNames: string[]
  sourceLinks: SourceLink[]
  images: ImageAsset[]
  hasUsableImage: boolean
  imageRightsSummary: string
  hasNonBrandTopPurchaseLink: boolean
}

/** 管理画面のカード表示に必要な情報をProductへ結合する(N+1にならないよう一括取得したデータを渡す) */
export function toProductCard(product: Product, allSourceLinks: SourceLink[], allImageAssets: ImageAsset[]): ProductCard {
  const sourceLinks = allSourceLinks.filter((l) => product.sourceLinkIds.includes(l.id))
  const images = allImageAssets.filter((a) => product.imageAssetIds.includes(a.id))
  const hasUsableImage = images.some((a) => isImageAutoUsable(a))

  let imageRightsSummary = "UNKNOWN"
  if (images.length === 0) imageRightsSummary = "NO IMAGE(Placeholder表示)"
  else if (hasUsableImage) imageRightsSummary = "APPROVED"
  else if (images.some((a) => a.rightsStatus === "embed_only")) imageRightsSummary = "EMBED ONLY"
  else if (images.some((a) => a.rightsStatus === "prohibited")) imageRightsSummary = "PROHIBITED"
  else imageRightsSummary = "REVIEW REQUIRED"

  return {
    product,
    sourceNames: [...new Set(sourceLinks.map((l) => l.publisher))],
    sourceLinks,
    images,
    hasUsableImage,
    imageRightsSummary,
    hasNonBrandTopPurchaseLink: product.purchaseLinkCandidates.some((c) => !c.isBrandTopOnly),
  }
}

export async function listProductCards(products: Product[]): Promise<ProductCard[]> {
  const allSourceLinkIds = [...new Set(products.flatMap((p) => p.sourceLinkIds))]
  const allImageAssetIds = [...new Set(products.flatMap((p) => p.imageAssetIds))]
  const [sourceLinks, imageAssets] = await Promise.all([
    listSourceLinks(allSourceLinkIds),
    listImageAssets(allImageAssetIds),
  ])
  return products.map((p) => toProductCard(p, sourceLinks, imageAssets))
}

export async function findOfficialSourcesForBrand(brand: string | null): Promise<Source[]> {
  if (!brand) return []
  const sources = await listSources()
  const needle = brand.toLowerCase()
  return sources.filter(
    (s) => s.category === "official" && s.url && (s.name.toLowerCase().includes(needle) || s.id.includes(needle))
  )
}
