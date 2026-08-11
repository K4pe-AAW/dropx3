import { addDrafts, generateId } from "@/lib/storage"
import { getOpenAIClient } from "@/lib/openai-client"
import { siteConfig } from "@/lib/site-config"
import type { Category, Draft } from "@/lib/types"
import { isImageAutoUsable } from "./image-rights"
import { listImageAssets, listSourceItems, listSourceLinks, updateProduct } from "./storage"
import type { Product, SourceItem, SourceLink } from "./types"

const MISSING = "未発表" // 発売日等、まだ情報自体が出ていない場合
const UNCONFIRMED = "未確認" // 国内発売の有無など、確認が取れていない場合
const PENDING = "情報公開待ち" // 価格等、続報待ちの場合

const CATEGORY_KEYWORDS: [string, Category][] = [
  ["スニーカー", "sneaker"], ["シューズ", "sneaker"], ["靴", "boots"], ["ブーツ", "boots"],
  ["ジャケット", "jacket"], ["アウター", "jacket"], ["コート", "jacket"],
  ["パンツ", "pants"], ["デニム", "pants"],
  ["トップス", "tops"], ["Tシャツ", "tops"], ["シャツ", "tops"], ["ニット", "tops"],
  ["バッグ", "accessory"], ["アクセサリー", "accessory"], ["キャップ", "accessory"],
  ["フィギュア", "figure"], ["ソフビ", "figure"],
]

function mapCategory(raw: string | null): Category {
  if (raw) {
    for (const [kw, slug] of CATEGORY_KEYWORDS) {
      if (raw.includes(kw)) return slug
    }
  }
  return "sneaker"
}

function isConfirmedLinkType(type: SourceLink["type"]): boolean {
  return type === "official_news" || type === "official_product" || type === "official_social" || type === "press_release" || type === "retailer"
}

const SYSTEM_PROMPT = `あなたはストリートファッション/スニーカーニュースメディア「${siteConfig.name}」の編集者です。
渡されるのはSOURCE WATCH(情報収集システム)が確認済み情報源から集めた構造化データです。
これを元に${siteConfig.name}らしい文章の記事下書きを書いてください。

絶対に守るルール:
- 与えられたデータに無い事実(価格・発売日・型番・カラー等)を絶対に作り出さないこと。
- 発売日そのものが情報源に存在しない場合は本文中で「${MISSING}」、
  国内発売の有無が確認できていない場合は「${UNCONFIRMED}」、
  価格などその他の続報待ちの情報は「${PENDING}」という言葉を使って正直に書くこと。曖昧にぼかしたり、
  それらしい数値で埋めたりしないこと。
- 海外の発売日と国内の発売日は別物として扱い、海外発売日だけを国内発売日であるかのように書かないこと。

文体は既存の記事と同じく、事実の羅列ではなく編集者の温度感がにじむ文章にすること。`

function buildUserPrompt(product: Product, items: SourceItem[]): string {
  const facts = items
    .map((i) => `- [${i.title}] ${i.rawText?.slice(0, 500) ?? "(本文なし)"}`)
    .join("\n")
  const colorwaysText = product.colorways
    .map((c) => `  - カラー:${c.colorName ?? "?"} / 型番:${c.styleCode ?? "?"} / 価格:${c.price ?? "?"} / 発売日:${c.releaseDate ?? "?"}`)
    .join("\n")

  return `商品情報(SOURCE WATCHが抽出した確認済みデータ):
ブランド: ${product.brand ?? "?"}
商品名: ${product.productName ?? "?"}
型番: ${product.styleCode ?? "?"}
国内発売確認: ${product.domesticConfirmed ? "確認済み" : "未確認"}
カラー展開:
${colorwaysText || "  (情報なし)"}

情報源となった記事の抜粋:
${facts}

以下のJSON形式で返してください:
{
  "title": "${siteConfig.name}らしい独自タイトル(40文字前後)",
  "excerpt": "記事一覧に出す1文要約(50文字前後)",
  "bodyParagraphs": ["段落1", "段落2", "段落3", "段落4"]
}`
}

async function writeDraftBody(product: Product, items: SourceItem[]): Promise<{ title: string; excerpt: string; bodyParagraphs: string[] }> {
  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(product, items) },
    ],
    temperature: 0.6,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  })
  const content = response.choices[0]?.message?.content
  const fallbackTitle = [product.brand, product.productName].filter(Boolean).join(" ") || "新着商品情報"
  if (!content) return { title: fallbackTitle, excerpt: "", bodyParagraphs: [] }
  try {
    const parsed = JSON.parse(content)
    return {
      title: typeof parsed.title === "string" && parsed.title ? parsed.title : fallbackTitle,
      excerpt: typeof parsed.excerpt === "string" ? parsed.excerpt : "",
      bodyParagraphs: Array.isArray(parsed.bodyParagraphs) ? parsed.bodyParagraphs.filter((p: unknown) => typeof p === "string") : [],
    }
  } catch {
    return { title: fallbackTitle, excerpt: "", bodyParagraphs: [] }
  }
}

export class NotConfirmedError extends Error {
  constructor() {
    super("REPORTED/RUMORの商品は記事候補化できません(CONFIRMEDのみ)")
    this.name = "NotConfirmedError"
  }
}

/**
 * CONFIRMED商品からDraftを生成する。「記事候補を見る」ボタンから呼ばれる唯一の入口。
 * REPORTED/RUMORはここで例外を投げて拒否する(UI側でボタン自体を出さない設計だが、
 * API側でも二重に防御する)。生成されたDraftは既存のDraft審査フロー(/admin/drafts/[id])に
 * そのまま乗るため、画像・リンク・カラー展開は全て人間が公開前に確認・修正できる。
 */
export async function buildDraftFromProduct(product: Product): Promise<Draft> {
  if (product.tier !== "CONFIRMED") throw new NotConfirmedError()

  const [allItems, sourceLinks, imageAssets] = await Promise.all([
    listSourceItems(),
    listSourceLinks(product.sourceLinkIds),
    listImageAssets(product.imageAssetIds),
  ])
  const items = allItems.filter((i) => product.sourceItemIds.includes(i.id))

  const written = await writeDraftBody(product, items)
  const usableImages = imageAssets.filter((a) => isImageAutoUsable(a))

  const suggestedGalleryImages = usableImages.map((a) => ({ url: a.url, alt: product.productName ?? written.title }))
  const suggestedColorways = product.colorways.map((c) => ({
    colorName: c.colorName ?? "",
    ...(c.styleCode ? { styleCode: c.styleCode } : {}),
    ...(c.price ? { price: c.price } : { price: PENDING }),
    ...(c.size ? { size: c.size } : {}),
    ...(c.releaseDate ? { releaseDate: c.releaseDate } : { releaseDate: MISSING }),
    ...(c.retailers.length > 0 ? { retailers: c.retailers } : {}),
  }))
  const officialLinks = sourceLinks
    .filter((l) => isConfirmedLinkType(l.type))
    .map((l) => ({ label: `${l.publisher}で見る`, url: l.url }))

  const draft: Draft = {
    id: generateId(`sw-draft-${product.id}-${Date.now()}`),
    status: "pending",
    title: written.title,
    excerpt: written.excerpt || (product.domesticConfirmed ? "国内発売情報も確認済み。" : `国内発売は${UNCONFIRMED}。続報に注目。`),
    bodyParagraphs: written.bodyParagraphs,
    category: mapCategory(product.category),
    brands: product.brand ? [product.brand] : [],
    tags: [],
    suggestedAffiliateSearch: [product.brand, product.productName, product.styleCode].filter((v): v is string => Boolean(v)),
    sourceRefs: sourceLinks.map((l) => ({ name: l.publisher, url: l.url })),
    createdAt: new Date().toISOString(),
    sourceWatchProductId: product.id,
    ...(suggestedGalleryImages[0] ? { suggestedCoverImage: suggestedGalleryImages[0].url } : {}),
    suggestedGalleryImages,
    suggestedColorways,
    suggestedOfficialLinks: officialLinks,
  }

  const { saved } = await addDrafts([draft])
  if (saved === 0) {
    // 情報元URLが既存の下書きと重複していた(addDraftsの重複排除)。新規保存はされていないので
    // Productにも紐付けない — 既存の下書きは/adminの一覧からそのまま見つけられる。
    throw new Error("同じ情報元を持つ下書きが既に存在します(/adminの下書き一覧をご確認ください)")
  }
  await updateProduct(product.id, { draftId: draft.id, reviewStatus: "drafted" })
  return draft
}
