import { isImageAutoUsable } from "./image-rights"
import { computeReadiness, type ReadinessResult } from "./scoring"
import type { ImageAsset, Product, PurchaseLinkCandidate } from "./types"

export type ReadinessOverrides = {
  purchaseLinkCandidates?: PurchaseLinkCandidate[]
  domesticConfirmed?: boolean
}

/**
 * tier/officialConfirmedを変えない操作(画像権利判定・画像の手動追加・購入リンクの手動追加・国内販売の追加確認)
 * 専用のreadiness再計算。呼び出し側は変更後の最新imageAssetsを必ず渡すこと(readinessBreakdownの値から
 * 逆算するのは壊れやすいため行わない)。
 *
 * tier自体が変わる操作(find-primaryの一次情報確定)はreliableSourceCountの扱いが既存と異なるため対象外
 * — そちらは従来通り個別に計算する(既存挙動を変えないため統合しない)。
 */
export function recomputeReadiness(product: Product, imageAssets: ImageAsset[], overrides: ReadinessOverrides = {}): ReadinessResult {
  const purchaseLinkCandidates = overrides.purchaseLinkCandidates ?? product.purchaseLinkCandidates
  const domesticConfirmed = overrides.domesticConfirmed ?? product.domesticConfirmed
  const hasSafeImage = imageAssets.some((a) => isImageAutoUsable(a))
  const hasAnyImage = imageAssets.length > 0

  return computeReadiness({
    tier: product.tier,
    officialConfirmed: product.officialConfirmed,
    hasProductName: Boolean(product.productName),
    hasBrand: Boolean(product.brand),
    hasStyleCode: Boolean(product.styleCode),
    hasReleaseDate: product.colorways.some((c) => c.releaseDate),
    hasPrice: product.colorways.some((c) => c.price),
    domesticConfirmed,
    hasSafeImage,
    hasUnresolvedImageRights: hasAnyImage && !hasSafeImage,
    hasAccuratePurchaseLink: purchaseLinkCandidates.some((c) => !c.isBrandTopOnly),
    hasRelatedArticle: product.readinessBreakdown.relatedArticles > 0,
    sourceLinkCount: product.sourceLinkIds.length,
    isDuplicate: false,
    domesticClaimedWithoutConfirmation: false,
    priceGuessedWithoutSource: false,
  })
}
