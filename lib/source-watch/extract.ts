import { getOpenAIClient } from "@/lib/openai-client"
import type { ExtractedProductInfo, SourceItem } from "./types"

const EMPTY_EXTRACTION: ExtractedProductInfo = {
  brand: null,
  productName: null,
  modelName: null,
  styleCode: null,
  colorway: null,
  category: null,
  releaseDate: null,
  overseasReleaseDate: null,
  domesticReleaseDate: null,
  price: null,
  currency: null,
  salesRegion: null,
  collabPartner: null,
  retailers: null,
  lotteryInfo: null,
  isReissue: null,
}

const SYSTEM_PROMPT = `あなたはストリートファッション/スニーカーニュースの一次情報抽出アシスタントです。
与えられたテキストから商品情報を抽出しますが、最も重要なルールは「本文に明記されていない項目は
絶対に補完・推測・creatingしない」ことです。書かれていない値は必ずnullを返してください。
一般的な業界知識で「たぶんこうだろう」と埋めることは重大な誤りとして扱われます。

特に以下は厳格に区別してください:
- overseasReleaseDate(海外発売日)とdomesticReleaseDate(国内発売日)は別物です。
  本文が海外の発売日にしか言及していない場合、domesticReleaseDateをoverseasReleaseDateの値で
  埋めてはいけません(nullのままにする)。
- priceは本文に明記された金額のみ。「参考価格」「想定価格」など推測を匂わせる記述しかない場合はnullにする。
- isReissueは「再販」「復刻」等の明記がある場合のみtrue、「新作」「初登場」等の明記がある場合のみfalse、
  言及が無ければnull。

必ず以下のJSON形式のみを返してください。前後の説明文は不要です。`

function buildUserPrompt(item: SourceItem): string {
  return `以下はニュースソースから取得したテキストです。

タイトル: ${item.title}
本文/抜粋:
${item.rawText ?? "(本文なし。タイトルのみで判断できる範囲で抽出してください)"}

次のJSON形式で、本文に明記されている項目だけを埋めてください(不明な項目はnull):
{
  "brand": "ブランド名 or null",
  "productName": "正式商品名 or null",
  "modelName": "モデル名(ブランド名を除いた部分) or null",
  "styleCode": "型番/品番 or null",
  "colorway": "カラー名 or null(複数色ある場合はカンマ区切りで列挙)",
  "category": "商品カテゴリ(スニーカー/アパレル等) or null",
  "releaseDate": "発売日(地域不明な場合の一般的な表記) or null",
  "overseasReleaseDate": "海外発売日(明記があれば) or null",
  "domesticReleaseDate": "国内発売日(明記があれば) or null",
  "price": "価格(通貨込みの表示用文字列) or null",
  "currency": "通貨コード(JPY/USD等) or null",
  "salesRegion": "販売地域 or null",
  "collabPartner": "コラボ相手 or null",
  "retailers": ["販売店名"] or null,
  "lotteryInfo": "抽選情報(応募期間・条件等) or null",
  "isReissue": true/false/null
}`
}

export async function extractProductInfo(item: SourceItem): Promise<ExtractedProductInfo> {
  if (!item.rawText && !item.title) return EMPTY_EXTRACTION
  const openai = getOpenAIClient()

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(item) },
    ],
    temperature: 0.1, // 抽出タスクなので創造性は最小限に絞る
    max_tokens: 1200,
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  if (!content) return EMPTY_EXTRACTION

  let parsed: Partial<ExtractedProductInfo>
  try {
    parsed = JSON.parse(content)
  } catch {
    return EMPTY_EXTRACTION
  }

  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)
  const strArr = (v: unknown): string[] | null =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : null
  const boolOrNull = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null)

  return {
    brand: str(parsed.brand),
    productName: str(parsed.productName),
    modelName: str(parsed.modelName),
    styleCode: str(parsed.styleCode),
    colorway: str(parsed.colorway),
    category: str(parsed.category),
    releaseDate: str(parsed.releaseDate),
    overseasReleaseDate: str(parsed.overseasReleaseDate),
    domesticReleaseDate: str(parsed.domesticReleaseDate),
    price: str(parsed.price),
    currency: str(parsed.currency),
    salesRegion: str(parsed.salesRegion),
    collabPartner: str(parsed.collabPartner),
    retailers: strArr(parsed.retailers),
    lotteryInfo: str(parsed.lotteryInfo),
    isReissue: boolOrNull(parsed.isReissue),
  }
}
