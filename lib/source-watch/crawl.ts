import { getAllArticles, generateId } from "@/lib/storage"
import { canonicalBrandName } from "@/lib/brands"
import {
  addImageAsset,
  addSourceLink,
  createSourceItem,
  findProductByMatchKey,
  findSourceItemByUrl,
  getLatestCrawlLog,
  listSourceItems,
  listSources,
  recordCrawlLog,
  updateSourceItem,
  upsertProduct,
} from "./storage"
import { checkRobots } from "./robots"
import { fetchRss } from "./fetchers/rss"
import { fetchSitemap } from "./fetchers/sitemap"
import { fetchHtmlListing, fetchPageText } from "./fetchers/html"
import { extractProductInfo } from "./extract"
import { buildProductMatchKey, normalizeUrl } from "./normalize"
import { classifyTier, computeCorroboratedScore, computeReadiness, determineDomesticConfirmed, determineOfficialConfirmed } from "./scoring"
import type {
  CrawlLog,
  ExtractedProductInfo,
  ImageAsset,
  ImageSourceType,
  MonitoringMethod,
  Product,
  ProductColorwayCandidate,
  RobotsVerdict,
  Source,
  SourceItem,
  SourceLinkType,
} from "./types"

const RELIABLE_CATEGORIES = new Set(["official", "press", "retailer", "early_media", "domestic_media"])
// 1回の巡回で処理する新着件数の上限。sitemapは過去URLも一度に返すため、上限が無いと
// 初回巡回だけでOpenAI抽出コールが大量発生し時間・コストの両方で問題になる。新しい順に
// 優先して処理し、残りは間隔を空けて次回以降の巡回で徐々に消化する(バックプレッシャー)。
const MAX_ITEMS_PER_CRAWL = 15

function isSourceDue(source: Source, latestLog: CrawlLog | undefined): boolean {
  if (!latestLog) return true
  const elapsedMs = Date.now() - new Date(latestLog.startedAt).getTime()
  return elapsedMs >= source.monitoringIntervalMinutes * 60 * 1000
}

function sourceLinkTypeFor(category: Source["category"]): SourceLinkType {
  switch (category) {
    case "official":
      return "official_news"
    case "press":
      return "press_release"
    case "retailer":
      return "retailer"
    case "social":
      return "rumor"
    default:
      return "media"
  }
}

function imageSourceTypeFor(source: Source): ImageSourceType {
  switch (source.category) {
    case "official":
      return source.imagePolicy === "press_assets_available" ? "official_press" : "official_store"
    case "press":
      return "pr_service"
    case "retailer":
      return "retailer"
    case "social":
      return "official_social"
    default:
      return "third_party_media"
  }
}

/**
 * 新しい抽出結果を既存のカラー展開配列にマージする。型番/カラー名が一致すればそのエントリを更新し、
 * どちらも無く候補が1件だけ(単色展開の商品)ならそのエントリを更新、それ以外は新規エントリとして追加する。
 */
function mergeColorway(
  existing: ProductColorwayCandidate[],
  extracted: ExtractedProductInfo,
  imageAssetIds: string[]
): ProductColorwayCandidate[] {
  const hasNewInfo =
    extracted.colorway || extracted.styleCode || extracted.price || extracted.domesticReleaseDate || extracted.releaseDate
  if (!hasNewInfo && imageAssetIds.length === 0) return existing

  let matchIdx = existing.findIndex((c) => {
    if (extracted.styleCode && c.styleCode === extracted.styleCode) return true
    if (extracted.colorway && c.colorName === extracted.colorway) return true
    return false
  })
  if (matchIdx === -1 && !extracted.colorway && existing.length === 1) {
    matchIdx = 0 // 単色展開の商品を後から更新するケース
  }
  const base = matchIdx >= 0 ? existing[matchIdx] : null

  const merged: ProductColorwayCandidate = {
    colorName: extracted.colorway ?? base?.colorName ?? null,
    styleCode: extracted.styleCode ?? base?.styleCode ?? null,
    price: extracted.price ?? base?.price ?? null,
    size: base?.size ?? null,
    releaseDate: extracted.domesticReleaseDate ?? extracted.releaseDate ?? base?.releaseDate ?? null,
    retailers: extracted.retailers ?? base?.retailers ?? [],
    imageAssetIds: [...new Set([...(base?.imageAssetIds ?? []), ...imageAssetIds])],
  }

  if (matchIdx >= 0) {
    const copy = [...existing]
    copy[matchIdx] = merged
    return copy
  }
  return [...existing, merged]
}

async function buildImageAssets(source: Source, item: SourceItem, extracted: ExtractedProductInfo): Promise<ImageAsset[]> {
  if (source.imagePolicy === "do_not_use" || !extracted.imageCandidates?.length) return []
  const sourceType = imageSourceTypeFor(source)
  const assets: ImageAsset[] = []
  for (const url of extracted.imageCandidates.slice(0, 5)) {
    try {
      new URL(url) // 不正なURLは無視
    } catch {
      continue
    }
    const asset = await addImageAsset({
      sourceItemId: item.id,
      url,
      sourceUrl: item.sourceUrl,
      sourceType,
      // ユーザー指定ルール: 見つかった画像は即使用せず必ずreview_required(人間確認)から始める。
      // third_party_mediaは審査後もprohibited/review_required以外にはしない(image-rights.ts側で二重ガード)。
      rightsStatus: "review_required",
      checkedAt: new Date().toISOString(),
    })
    assets.push(asset)
  }
  return assets
}

function isAutoUsable(assets: ImageAsset[]): boolean {
  return assets.some(
    (a) => a.sourceType !== "third_party_media" && ["approved", "permission_received", "terms_confirmed"].includes(a.rightsStatus)
  )
}

export async function buildExistingArticleSignature(): Promise<Set<string>> {
  const articles = await getAllArticles()
  const sig = new Set<string>()
  for (const a of articles) {
    for (const b of a.brands) sig.add(canonicalBrandName(b).toLowerCase())
    const bodyText = a.bodyParagraphs.join(" ")
    const codeMatch = bodyText.match(/[A-Z0-9]{4,}-[A-Z0-9]{2,}/g)
    codeMatch?.forEach((c) => sig.add(c.toLowerCase()))
  }
  return sig
}

export async function processSourceItem(source: Source, item: SourceItem, existingArticleSignature: Set<string>): Promise<void> {
  await updateSourceItem(item.id, { processingStatus: "analyzing" })

  let extracted: ExtractedProductInfo
  try {
    extracted = await extractProductInfo(item)
  } catch (err) {
    await updateSourceItem(item.id, { processingStatus: "error" })
    throw err
  }
  await updateSourceItem(item.id, { extracted, processingStatus: "processed" })

  const matchKey = buildProductMatchKey({
    styleCode: extracted.styleCode,
    brand: extracted.brand,
    modelName: extracted.modelName ?? extracted.productName,
  })

  const sourceLink = await addSourceLink({
    sourceItemId: item.id,
    publisher: source.name,
    url: item.sourceUrl,
    type: sourceLinkTypeFor(source.category),
    sourceScore: source.sourceScore,
    checkedAt: new Date().toISOString(),
  })

  const newImageAssets = await buildImageAssets(source, item, extracted)

  const canMatch = Boolean(matchKey.styleCode || (matchKey.normalizedBrand && matchKey.normalizedModelName))
  let product: Product | undefined = canMatch
    ? await findProductByMatchKey(matchKey.styleCode, matchKey.normalizedBrand, matchKey.normalizedModelName)
    : undefined

  const now = new Date().toISOString()
  if (!product) {
    product = {
      id: generateId(`product-${matchKey.styleCode ?? matchKey.normalizedBrand ?? item.id}-${item.id}`),
      normalizedBrand: matchKey.normalizedBrand,
      normalizedModelName: matchKey.normalizedModelName,
      styleCode: matchKey.styleCode,
      brand: extracted.brand ? canonicalBrandName(extracted.brand) : null,
      productName: extracted.productName,
      category: extracted.category,
      tier: "RUMOR",
      sourceScore: 0,
      officialConfirmed: false,
      domesticConfirmed: false,
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
  product.imageAssetIds = [...new Set([...product.imageAssetIds, ...newImageAssets.map((a) => a.id)])]
  product.colorways = mergeColorway(
    product.colorways,
    extracted,
    newImageAssets.map((a) => a.id)
  )
  product.productName = product.productName ?? extracted.productName
  product.brand = product.brand ?? (extracted.brand ? canonicalBrandName(extracted.brand) : null)
  product.category = product.category ?? extracted.category

  // --- 確認状態の再計算 ---
  const isAuthorizedRetailer = source.category === "retailer"
  if (determineOfficialConfirmed(sourceLink.type, isAuthorizedRetailer)) product.officialConfirmed = true
  if (determineDomesticConfirmed(extracted.domesticReleaseDate, isAuthorizedRetailer)) product.domesticConfirmed = true

  // --- Tier再計算: 寄与している distinct ソースを全て洗い出す ---
  const allItems = await listSourceItems()
  const contributingItems = allItems.filter((i) => product.sourceItemIds.includes(i.id))
  const allSources = await listSources()
  const contributingSources = contributingItems
    .map((i) => allSources.find((s) => s.id === i.sourceId))
    .filter((s): s is Source => Boolean(s))
  const distinctSources = [...new Map(contributingSources.map((s) => [s.id, s])).values()]
  const reliableSourceCount = distinctSources.filter((s) => RELIABLE_CATEGORIES.has(s.category)).length

  product.tier = classifyTier({
    hasOfficialOrAuthorizedRetailerLink: product.officialConfirmed,
    reliableSourceCount,
  })
  product.sourceScore = computeCorroboratedScore(distinctSources.map((s) => s.sourceScore))

  const hasSafeImage = isAutoUsable(newImageAssets)
  const hasAnyImage = product.imageAssetIds.length > 0
  const brandKey = product.brand ? canonicalBrandName(product.brand).toLowerCase() : null
  const hasRelatedArticle = Boolean(
    (brandKey && existingArticleSignature.has(brandKey)) ||
      (product.styleCode && existingArticleSignature.has(product.styleCode.toLowerCase()))
  )

  const readiness = computeReadiness({
    tier: product.tier,
    officialConfirmed: product.officialConfirmed,
    hasProductName: Boolean(product.productName),
    hasBrand: Boolean(product.brand),
    hasStyleCode: Boolean(product.styleCode),
    hasReleaseDate: product.colorways.some((c) => c.releaseDate),
    hasPrice: product.colorways.some((c) => c.price),
    domesticConfirmed: product.domesticConfirmed,
    hasSafeImage,
    hasUnresolvedImageRights: hasAnyImage && !hasSafeImage,
    hasAccuratePurchaseLink: product.purchaseLinkCandidates.some((c) => !c.isBrandTopOnly),
    hasRelatedArticle,
    sourceLinkCount: product.sourceLinkIds.length,
    isDuplicate: false,
    domesticClaimedWithoutConfirmation: false, // このパイプラインは推測でdomesticConfirmedをtrueにしないため構造的に発生しない
    priceGuessedWithoutSource: false, // 抽出は本文に無い価格を作らないため構造的に発生しない
  })
  product.readiness = readiness.readiness
  product.readinessScore = readiness.score
  product.readinessBreakdown = readiness.breakdown
  product.blockReasons = readiness.blockReasons

  await upsertProduct(product)
  await updateSourceItem(item.id, { productId: product.id })
}

async function dispatchFetch(source: Source) {
  const method: MonitoringMethod = source.monitoringMethod
  if (method === "rss") return fetchRss(source)
  if (method === "sitemap") return fetchSitemap(source)
  if (method === "html") return fetchHtmlListing(source)
  return { items: [], errors: [`未対応のmonitoringMethod: ${method}`] }
}

export async function crawlSource(source: Source): Promise<CrawlLog> {
  const startedAt = new Date().toISOString()
  const start = Date.now()
  const errors: string[] = []
  let newCount = 0
  let changedCount = 0
  let httpStatus: number | undefined
  let robotsVerdict: RobotsVerdict = "unknown"

  if (source.monitoringMethod === "manual") {
    return recordCrawlLog({
      sourceId: source.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      newCount: 0,
      changedCount: 0,
      errorCount: 0,
      errors: [],
      robotsVerdict: "not_found",
      method: source.monitoringMethod,
      durationMs: Date.now() - start,
    })
  }

  const targetUrl = source.feedUrl ?? source.url
  if (!targetUrl) {
    return recordCrawlLog({
      sourceId: source.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      newCount: 0,
      changedCount: 0,
      errorCount: 1,
      errors: ["urlが未設定のため巡回できません"],
      robotsVerdict: "unknown",
      method: source.monitoringMethod,
      durationMs: Date.now() - start,
    })
  }

  try {
    const origin = new URL(targetUrl).origin
    const path = new URL(targetUrl).pathname
    const robots = await checkRobots(origin, path)
    robotsVerdict = robots.verdict
    if (!robots.allowed) {
      return recordCrawlLog({
        sourceId: source.id,
        startedAt,
        finishedAt: new Date().toISOString(),
        newCount: 0,
        changedCount: 0,
        errorCount: 0,
        errors: [],
        robotsVerdict,
        method: source.monitoringMethod,
        durationMs: Date.now() - start,
      })
    }

    const fetchResult = await dispatchFetch(source)
    httpStatus = fetchResult.httpStatus
    errors.push(...fetchResult.errors)

    const existingArticleSignature = await buildExistingArticleSignature()

    const sortedItems = [...fetchResult.items].sort((a, b) => {
      if (!a.publishedAt && !b.publishedAt) return 0
      if (!a.publishedAt) return 1
      if (!b.publishedAt) return -1
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    let processedThisRun = 0
    for (const fetched of sortedItems) {
      if (processedThisRun >= MAX_ITEMS_PER_CRAWL) break
      const existing = await findSourceItemByUrl(fetched.url)
      if (existing) continue // 同じURLは何度も登録しない

      let title = fetched.title
      let rawText = fetched.rawText
      if (!title) {
        const page = await fetchPageText(fetched.url)
        title = page?.title ?? normalizeUrl(fetched.url)
        rawText = rawText ?? page?.text
      }

      const item = await createSourceItem({
        sourceId: source.id,
        sourceUrl: fetched.url,
        title,
        publishedAt: fetched.publishedAt,
        detectedAt: new Date().toISOString(),
        rawText,
        processingStatus: "new",
      })
      newCount++
      processedThisRun++

      try {
        await processSourceItem(source, item, existingArticleSignature)
        changedCount++
      } catch (err) {
        errors.push(`${fetched.url}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
  }

  return recordCrawlLog({
    sourceId: source.id,
    startedAt,
    finishedAt: new Date().toISOString(),
    httpStatus,
    newCount,
    changedCount,
    errorCount: errors.length,
    errors: errors.slice(0, 10),
    robotsVerdict,
    method: source.monitoringMethod,
    durationMs: Date.now() - start,
  })
}

/** 有効かつ巡回頻度に基づき「今巡回すべき」ソースだけを対象に回す。sourceIdを指定すればそれ限定(頻度チェックも無視) */
export async function runDueCrawls(sourceId?: string): Promise<{ results: CrawlLog[] }> {
  const sources = await listSources()
  const targets = sources.filter((s) => {
    if (sourceId) return s.id === sourceId
    return s.enabled && s.monitoringMethod !== "manual"
  })

  const results: CrawlLog[] = []
  for (const source of targets) {
    if (!sourceId) {
      const latest = await getLatestCrawlLog(source.id)
      if (!isSourceDue(source, latest)) continue
    }
    results.push(await crawlSource(source))
  }
  return { results }
}
