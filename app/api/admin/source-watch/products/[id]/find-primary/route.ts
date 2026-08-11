import { NextRequest, NextResponse } from "next/server"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { getProduct, updateProduct, addSourceLink, listSourceLinks, listImageAssets, listSources } from "@/lib/source-watch/storage"
import { findOfficialSourcesForBrand, toProductCard } from "@/lib/source-watch/present"
import { classifyTier, computeCorroboratedScore, computeReadiness } from "@/lib/source-watch/scoring"
import { isWebSearchConfigured, searchWeb } from "@/lib/source-watch/web-search"

/**
 * 一次情報の確認を支援する。
 * (a) bodyにurlが無い場合: GOOGLE_CSE_API_KEY/GOOGLE_CSE_CXが設定されていれば実際に検索し実URLを返す。
 *     未設定の場合は登録済み公式Source一覧+検索エンジンへのリンクを返すだけ(fetchしない)にフォールバックする。
 * (b) 人間がその情報源を開いて確認し、見つかった公式URLをurlとして渡すと、SourceLinkとして保存し
 *     tier/readinessを再計算する(spec:「一次情報が見つかったら、記事のメインSourceを公式へ変更してください」)。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 })

  const body = await req.json().catch(() => ({}))

  if (!body.url) {
    const query = [product.brand, product.productName, product.styleCode].filter(Boolean).join(" ")
    const officialSources = await findOfficialSourcesForBrand(product.brand)
    const webSearchConfigured = isWebSearchConfigured()
    const realResults = webSearchConfigured ? await searchWeb(`${query} 公式`) : []
    const searchUrls = [
      ...officialSources.map((s) => ({ label: s.name, url: s.url as string })),
      ...realResults,
      ...(webSearchConfigured
        ? []
        : [{ label: "Google検索", url: `https://www.google.com/search?q=${encodeURIComponent(`${query} 公式 site:${product.brand ?? ""}`)}` }]),
    ]
    return NextResponse.json({ searchUrls, webSearchConfigured })
  }

  const url = String(body.url).trim()
  if (!isSafeExternalUrl(url)) return NextResponse.json({ error: "urlが不正です" }, { status: 400 })
  // Inspectorの「国内販売を探す」から呼ばれた場合はtrue。国内正規販売店URLの確定なので
  // officialConfirmedに加えdomesticConfirmedも立てる(従来のofficial確認だけの挙動はfalse時に維持)。
  const markDomestic = body.markDomestic === true

  // SourceLinkを追加する前に既存分を読んでおく。追加後に同じファイルを読み直すとVercel Blobの
  // CDN伝播遅延で古いデータが返ることがあるため、更新後の一覧は再読み込みせずこの配列 +
  // addSourceLinkの戻り値(メモリ上で確定した最新値)をマージして作る。
  const linksBefore = await listSourceLinks(product.sourceLinkIds)

  const link = await addSourceLink({
    publisher: typeof body.publisher === "string" && body.publisher.trim() ? body.publisher.trim() : new URL(url).hostname,
    url,
    type: "official_product",
    sourceScore: 100,
    checkedAt: new Date().toISOString(),
  })

  const sourceLinkIds = [...new Set([...product.sourceLinkIds, link.id])]
  const allLinks = linksBefore.some((l) => l.id === link.id) ? linksBefore : [...linksBefore, link]
  const distinctScores = [...new Set(allLinks.map((l) => l.sourceScore))]

  const tier = classifyTier({ hasOfficialOrAuthorizedRetailerLink: true, reliableSourceCount: allLinks.length })
  const sourceScore = computeCorroboratedScore([100, ...distinctScores])
  const readiness = computeReadiness({
    tier,
    officialConfirmed: true,
    hasProductName: Boolean(product.productName),
    hasBrand: Boolean(product.brand),
    hasStyleCode: Boolean(product.styleCode),
    hasReleaseDate: product.colorways.some((c) => c.releaseDate),
    hasPrice: product.colorways.some((c) => c.price),
    domesticConfirmed: product.domesticConfirmed || markDomestic,
    hasSafeImage: product.readinessBreakdown.safeImage > 0,
    hasUnresolvedImageRights: product.imageAssetIds.length > 0 && product.readinessBreakdown.safeImage === 0,
    hasAccuratePurchaseLink: product.purchaseLinkCandidates.some((c) => !c.isBrandTopOnly),
    hasRelatedArticle: product.readinessBreakdown.relatedArticles > 0,
    sourceLinkCount: sourceLinkIds.length,
    isDuplicate: false,
    domesticClaimedWithoutConfirmation: false,
    priceGuessedWithoutSource: false,
  })

  const updated = await updateProduct(id, {
    sourceLinkIds,
    officialConfirmed: true,
    ...(markDomestic ? { domesticConfirmed: true } : {}),
    tier,
    sourceScore,
    readiness: readiness.readiness,
    readinessScore: readiness.score,
    readinessBreakdown: readiness.breakdown,
    blockReasons: readiness.blockReasons,
  })

  const [images, sources] = await Promise.all([listImageAssets(updated.imageAssetIds), listSources()])
  return NextResponse.json(toProductCard(updated, allLinks, images, sources))
}
