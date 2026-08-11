import { generateId } from "@/lib/storage"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { canonicalBrandName } from "@/lib/brands"
import { addSourceLink, createSourceItem, findProductByMatchKey, findSourceItemByUrl, listSourceLinks, updateSource, updateSourceItem, upsertProduct } from "./storage"
import { extractSocialPostInfo } from "./social-extract"
import { buildProductMatchKey } from "./normalize"
import { classifyTier, computeCorroboratedScore, computeReadiness } from "./scoring"
import { makeCandidate } from "./purchase-links"
import { LOTTERY_LIKE_SALE_METHODS } from "./labels"
import type { Product, PurchaseLinkCandidate, SocialInfo, Source, SourceItem, SourceLink, SourceLinkType } from "./types"

function sourceLinkTypeFor(socialType: Source["socialType"]): SourceLinkType {
  switch (socialType) {
    case "official_brand":
    case "official_artist":
    case "official_event":
      return "official_social"
    case "official_store":
      return "retailer"
    case "media":
      return "media"
    default:
      return "rumor"
  }
}

function isOfficialSocialType(socialType: Source["socialType"]): boolean {
  return socialType === "official_brand" || socialType === "official_artist" || socialType === "official_event"
}

function mergeSocial(existing: SocialInfo | undefined, incoming: SocialInfo): SocialInfo {
  if (!existing) return incoming
  return {
    characterName: incoming.characterName ?? existing.characterName,
    seriesName: incoming.seriesName ?? existing.seriesName,
    eventName: incoming.eventName ?? existing.eventName,
    eventLocation: incoming.eventLocation ?? existing.eventLocation,
    saleMethod: incoming.saleMethod ?? existing.saleMethod,
    postTypes: incoming.postTypes.length > 0 ? incoming.postTypes : existing.postTypes,
    entryStartAt: incoming.entryStartAt ?? existing.entryStartAt,
    entryDeadlineAt: incoming.entryDeadlineAt ?? existing.entryDeadlineAt,
    winnerAnnounceAt: incoming.winnerAnnounceAt ?? existing.winnerAnnounceAt,
    saleStartAt: incoming.saleStartAt ?? existing.saleStartAt,
    saleEndAt: incoming.saleEndAt ?? existing.saleEndAt,
    eventStartAt: incoming.eventStartAt ?? existing.eventStartAt,
    eventEndAt: incoming.eventEndAt ?? existing.eventEndAt,
    shipAt: incoming.shipAt ?? existing.shipAt,
    purchaseLimit: incoming.purchaseLimit ?? existing.purchaseLimit,
    entryConditions: incoming.entryConditions ?? existing.entryConditions,
    targetRegion: incoming.targetRegion ?? existing.targetRegion,
    hashtags: [...new Set([...existing.hashtags, ...incoming.hashtags])],
  }
}

export class DuplicatePostError extends Error {
  constructor() {
    super("この投稿URLは既に登録済みです")
    this.name = "DuplicatePostError"
  }
}

/**
 * 「Instagram投稿URLを貼る」の解析本体。人間が用意したURL+キャプション本文をAI抽出し、
 * Product(SOCIAL WATCH向けにsocialフィールドを持つ)へマージする。
 * 画像は一切自動生成しない(Instagram画像の無断転載を避けるため — 詳細はtypes.tsのコメント参照)。
 * officialConfirmed/tier/readinessは既存の(ファッション記事と共通の)scoring.tsをそのまま使う。
 */
export async function analyzeSocialPost(source: Source, url: string, caption: string): Promise<{ item: SourceItem; product: Product; sourceLinks: SourceLink[] }> {
  const existingItem = await findSourceItemByUrl(url)
  if (existingItem) throw new DuplicatePostError()

  const extracted = await extractSocialPostInfo(caption, url)
  // キャプション本文が自分のブランド名を毎回名乗るとは限らない(例: INSTINCTOY公式が「新作ソフビ入荷」
  // とだけ書く投稿)。本文からブランドが抽出できず、かつ投稿者自身が公式ブランド/アーティスト/イベント
  // アカウントである場合に限り、そのアカウント名をブランドとして補う(本文の捏造ではなく、既に人間が
  // ソース登録時に確認済みの事実を使うだけ)。
  const effectiveBrand = extracted.brand ?? extracted.artist ?? (isOfficialSocialType(source.socialType) ? source.name : null)
  const effectiveName = extracted.productName ?? extracted.characterName ?? extracted.seriesName
  const matchKey = buildProductMatchKey({ styleCode: null, brand: effectiveBrand, modelName: effectiveName })

  const canMatch = Boolean(matchKey.normalizedBrand && matchKey.normalizedModelName)
  let product = canMatch ? await findProductByMatchKey(null, matchKey.normalizedBrand, matchKey.normalizedModelName) : undefined
  // SourceLinkを書き込む前に既存分を読んでおく(同一リクエスト内で書いたファイルを読み直すと
  // Vercel BlobのCDN伝播遅延で古いデータが返ることがあるため — product-recompute.ts等と同じ方針)
  const sourceLinksBefore = product ? await listSourceLinks(product.sourceLinkIds) : []

  const item = await createSourceItem({
    sourceId: source.id,
    sourceUrl: url,
    title: [effectiveBrand, effectiveName].filter(Boolean).join(" ") || extracted.eventName || source.name,
    detectedAt: new Date().toISOString(),
    rawText: caption,
    processingStatus: "processed",
  })

  const sourceLink = await addSourceLink({
    sourceItemId: item.id,
    publisher: source.name,
    url,
    type: sourceLinkTypeFor(source.socialType),
    sourceScore: source.sourceScore,
    checkedAt: new Date().toISOString(),
  })
  const sourceLinks = sourceLinksBefore.some((l) => l.id === sourceLink.id) ? sourceLinksBefore : [...sourceLinksBefore, sourceLink]

  // Instagramのキャプションは実URLの代わりに「プロフィールのリンクから」等の文言だけのことが多い。
  // AI抽出がそれをそのままentryUrl/purchaseUrlに入れてしまうケースがあるため、実在するURLかどうかを
  // ここでも二重に検証する(makeCandidate内のisBrandTopUrlはURL構文エラーを安全側で吸収するだけで、
  // 「文字列としては保存してしまう」問題までは防げないため)。
  const newPurchaseLinks: PurchaseLinkCandidate[] = []
  if (extracted.entryUrl && isSafeExternalUrl(extracted.entryUrl)) newPurchaseLinks.push(makeCandidate(extracted.entryUrl, "official_lottery", "応募ページへ"))
  if (extracted.purchaseUrl && isSafeExternalUrl(extracted.purchaseUrl)) newPurchaseLinks.push(makeCandidate(extracted.purchaseUrl, "official_product"))

  const now = new Date().toISOString()
  const incomingSocial: SocialInfo = {
    characterName: extracted.characterName,
    seriesName: extracted.seriesName,
    eventName: extracted.eventName,
    eventLocation: extracted.eventLocation,
    saleMethod: extracted.saleMethod,
    postTypes: extracted.postTypes,
    entryStartAt: extracted.entryStartAt,
    entryDeadlineAt: extracted.entryDeadlineAt,
    winnerAnnounceAt: extracted.winnerAnnounceAt,
    saleStartAt: extracted.saleStartAt,
    saleEndAt: extracted.saleEndAt,
    eventStartAt: extracted.eventStartAt,
    eventEndAt: extracted.eventEndAt,
    shipAt: extracted.shipAt,
    purchaseLimit: extracted.purchaseLimit,
    entryConditions: extracted.entryConditions,
    targetRegion: extracted.targetRegion,
    hashtags: extracted.hashtags,
  }

  if (!product) {
    product = {
      id: generateId(`social-product-${matchKey.normalizedBrand ?? source.id}-${item.id}`),
      normalizedBrand: matchKey.normalizedBrand,
      normalizedModelName: matchKey.normalizedModelName,
      styleCode: null,
      brand: effectiveBrand ? canonicalBrandName(effectiveBrand) : null,
      productName: effectiveName,
      category: null,
      tier: "RUMOR",
      sourceScore: 0,
      officialConfirmed: false,
      // SOCIAL WATCHの投稿は海外/国内の区別が実質無い(JPアーティスト/ブランドがJP向けに投稿する
      // ケースが大半)ため、officialConfirmedと同じ条件でtrueにする(捏造ではなく妥当な既定値)。
      domesticConfirmed: false,
      lotteryInfo: null,
      colorways: [],
      sourceItemIds: [],
      sourceLinkIds: [],
      imageAssetIds: [],
      purchaseLinkCandidates: [],
      reviewStatus: "pending",
      readiness: "HOLD",
      readinessScore: 0,
      readinessBreakdown: {},
      blockReasons: [],
      firstDetectedAt: now,
      updatedAt: now,
    }
  }

  product.sourceItemIds = [...new Set([...product.sourceItemIds, item.id])]
  product.sourceLinkIds = [...new Set([...product.sourceLinkIds, sourceLink.id])]
  product.purchaseLinkCandidates = [
    ...product.purchaseLinkCandidates,
    ...newPurchaseLinks.filter((c) => !product!.purchaseLinkCandidates.some((existing) => existing.url === c.url)),
  ]
  product.productName = product.productName ?? effectiveName
  product.brand = product.brand ?? (effectiveBrand ? canonicalBrandName(effectiveBrand) : null)
  product.social = mergeSocial(product.social, incomingSocial)

  const isOfficial = isOfficialSocialType(source.socialType)
  if (isOfficial) {
    product.officialConfirmed = true
    product.domesticConfirmed = true
  }
  if (extracted.price && !product.colorways.some((c) => c.price)) {
    product.colorways = [
      { colorName: extracted.colorway, styleCode: null, price: extracted.price, size: null, releaseDate: product.social.saleStartAt, retailers: [], imageAssetIds: [] },
    ]
  }
  if (product.social.saleMethod && LOTTERY_LIKE_SALE_METHODS.includes(product.social.saleMethod)) {
    product.lotteryInfo = [product.social.entryStartAt, product.social.entryDeadlineAt].filter(Boolean).join(" 〜 ") || product.lotteryInfo
  }

  product.tier = classifyTier({ hasOfficialOrAuthorizedRetailerLink: product.officialConfirmed, reliableSourceCount: product.sourceLinkIds.length })
  product.sourceScore = computeCorroboratedScore([source.sourceScore])

  const hasReleaseDate = Boolean(product.social.saleStartAt || product.social.eventStartAt || product.social.entryStartAt)
  const readiness = computeReadiness({
    tier: product.tier,
    officialConfirmed: product.officialConfirmed,
    hasProductName: Boolean(product.productName),
    hasBrand: Boolean(product.brand),
    hasStyleCode: false,
    hasReleaseDate,
    hasPrice: Boolean(extracted.price),
    domesticConfirmed: product.domesticConfirmed,
    // SOCIAL WATCHでは画像を自動生成しないため、常に「画像なし」であって「Rights不明」ではない
    // (ImageAssetを作らないのでhasUnresolvedImageRightsは構造的に発生しない)
    hasSafeImage: false,
    hasUnresolvedImageRights: false,
    hasAccuratePurchaseLink: product.purchaseLinkCandidates.some((c) => !c.isBrandTopOnly),
    hasRelatedArticle: false,
    sourceLinkCount: product.sourceLinkIds.length,
    isDuplicate: false,
    domesticClaimedWithoutConfirmation: false,
    priceGuessedWithoutSource: false,
  })
  product.readiness = readiness.readiness
  product.readinessScore = readiness.score
  product.readinessBreakdown = readiness.breakdown
  product.blockReasons = readiness.blockReasons

  await upsertProduct(product)
  await updateSourceItem(item.id, { productId: product.id })
  await updateSource(source.id, { lastCheckedAt: now })

  return { item, product, sourceLinks }
}
