import { getOpenAIClient } from "@/lib/openai-client"
import { SALE_METHODS, SOCIAL_POST_TYPES } from "./labels"
import type { SaleMethod, SocialPostType } from "./types"

/**
 * Instagram投稿(人間がURL+キャプション本文を貼ったもの)から抽出する情報。
 * extract.ts(スニーカー/ファッションニュース向け)とは別関数にしてある — ソフビ/アートトイ/イベント/
 * 抽選という別ドメインの語彙をextract.tsのプロンプトに混ぜると両方の精度が落ちるため。
 * 「本文に明記が無い項目は捏造しない」という規律はextract.tsと完全に同じ。
 */
export type ExtractedSocialPostInfo = {
  brand: string | null
  artist: string | null
  productName: string | null
  characterName: string | null
  seriesName: string | null
  colorway: string | null
  collabPartner: string | null
  eventName: string | null
  eventLocation: string | null
  saleMethod: SaleMethod | null
  postTypes: SocialPostType[]
  entryStartAt: string | null
  entryDeadlineAt: string | null
  winnerAnnounceAt: string | null
  saleStartAt: string | null
  saleEndAt: string | null
  eventStartAt: string | null
  eventEndAt: string | null
  shipAt: string | null
  price: string | null
  currency: string | null
  quantity: string | null
  purchaseLimit: string | null
  entryConditions: string | null
  targetRegion: string | null
  purchaseUrl: string | null
  entryUrl: string | null
  hashtags: string[]
}

const EMPTY_EXTRACTION: ExtractedSocialPostInfo = {
  brand: null,
  artist: null,
  productName: null,
  characterName: null,
  seriesName: null,
  colorway: null,
  collabPartner: null,
  eventName: null,
  eventLocation: null,
  saleMethod: null,
  postTypes: [],
  entryStartAt: null,
  entryDeadlineAt: null,
  winnerAnnounceAt: null,
  saleStartAt: null,
  saleEndAt: null,
  eventStartAt: null,
  eventEndAt: null,
  shipAt: null,
  price: null,
  currency: null,
  quantity: null,
  purchaseLimit: null,
  entryConditions: null,
  targetRegion: null,
  purchaseUrl: null,
  entryUrl: null,
  hashtags: [],
}

const SYSTEM_PROMPT = `あなたはソフビ/アートトイ/フィギュア/限定品/イベント/抽選販売分野のInstagram投稿解析アシスタントです。
渡されるのは人間が実際にInstagramを見て貼り付けたキャプション本文です。

絶対に守るルール:
- 本文に明記されていない項目は絶対に補完・推測・creatingしない。書かれていない値は必ずnull(または空配列)。
- 日付は「今日の日付」を基準に、本文中の月日(例: 8/14)を妥当な西暦の日付に補い、
  時刻が明記されていればISO 8601形式(YYYY-MM-DDTHH:mm:00+09:00、日本時間)で、
  時刻が明記されていなければ日付のみ(YYYY-MM-DD)で返す。時刻を推測で埋めない。
  年が明記されておらず、その月日が既に過去なら翌年と解釈する。
- entryStartAt/entryDeadlineAt=応募の開始/締切、winnerAnnounceAt=当選発表、
  saleStartAt/saleEndAt=販売の開始/終了、eventStartAt/eventEndAt=イベント開催の開始/終了、
  shipAt=発送予定。それぞれ本文に無ければnull。
- saleMethodは一般/先着/抽選/WEB抽選/店頭抽選/入場抽選/受注/予約/イベント限定/オンライン限定/会場限定の
  いずれかに明確に該当する場合のみ設定し、判断できなければnull。
  特にstore_lottery(店頭抽選=店舗で購入するための抽選)とentry_lottery(入場抽選=イベント/会場へ
  入場するための抽選)は混同しやすいので、「購入のための抽選」か「入場のための抽選」かで区別すること。
- purchaseUrl/entryUrlは、本文中に実際に"https://..."のようなURL文字列が書かれている場合のみ設定する。
  「プロフィールのリンクから」「ストーリーズのリンクをチェック」のようなURL自体が書かれていない
  案内文はpurchaseUrl/entryUrlに入れず、必ずnullにする(実在しないURLを作らない)。
- postTypesは複数可。該当しないものは含めない。

必ず以下のJSON形式のみを返してください。前後の説明文は不要です。`

function buildUserPrompt(caption: string, postUrl: string, referenceDateJst: string): string {
  return `今日の日付(基準日、日本時間): ${referenceDateJst}
投稿URL: ${postUrl}

Instagramキャプション本文:
${caption}

次のJSON形式で、本文に明記されている項目だけを埋めてください(不明な項目はnullまたは空配列):
{
  "brand": "ブランド名 or null",
  "artist": "アーティスト名(ブランドと別に個人名がある場合) or null",
  "productName": "商品/アイテム名 or null",
  "characterName": "キャラクター名 or null",
  "seriesName": "シリーズ名 or null",
  "colorway": "カラー名 or null",
  "collabPartner": "コラボ相手 or null",
  "eventName": "イベント名 or null",
  "eventLocation": "開催場所(会場名・住所) or null",
  "saleMethod": "general/first_come/lottery/web_lottery/store_lottery/entry_lottery/made_to_order/preorder/event_limited/online_limited/venue_limited のいずれか or null",
  "postTypes": ["raffle/release/restock/preorder/made_to_order/event/popup/collab/teaser/sold_out/result/other から該当するもの"],
  "entryStartAt": "応募開始日時 or null",
  "entryDeadlineAt": "応募締切日時 or null",
  "winnerAnnounceAt": "当選発表日時 or null",
  "saleStartAt": "販売開始日時 or null",
  "saleEndAt": "販売終了日時 or null",
  "eventStartAt": "イベント開始日時 or null",
  "eventEndAt": "イベント終了日時 or null",
  "shipAt": "発送予定日 or null",
  "price": "価格(通貨込みの表示用文字列) or null",
  "currency": "通貨コード(JPY/USD等) or null",
  "quantity": "数量(明記があれば) or null",
  "purchaseLimit": "購入制限(お一人様1点まで等) or null",
  "entryConditions": "応募条件 or null",
  "targetRegion": "対象地域 or null",
  "purchaseUrl": "本文中の購入用URL or null",
  "entryUrl": "本文中の応募用URL or null",
  "hashtags": ["本文中のハッシュタグ(#無し)"]
}`
}

function jstToday(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }) // YYYY-MM-DD形式
}

export async function extractSocialPostInfo(caption: string, postUrl: string): Promise<ExtractedSocialPostInfo> {
  if (!caption.trim()) return EMPTY_EXTRACTION
  const openai = getOpenAIClient()

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(caption, postUrl, jstToday()) },
    ],
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  if (!content) return EMPTY_EXTRACTION

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content)
  } catch {
    return EMPTY_EXTRACTION
  }

  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : []
  const saleMethod = (v: unknown): SaleMethod | null => (SALE_METHODS.includes(v as SaleMethod) ? (v as SaleMethod) : null)
  const postTypes = (v: unknown): SocialPostType[] =>
    Array.isArray(v) ? v.filter((x): x is SocialPostType => SOCIAL_POST_TYPES.includes(x as SocialPostType)) : []

  return {
    brand: str(parsed.brand),
    artist: str(parsed.artist),
    productName: str(parsed.productName),
    characterName: str(parsed.characterName),
    seriesName: str(parsed.seriesName),
    colorway: str(parsed.colorway),
    collabPartner: str(parsed.collabPartner),
    eventName: str(parsed.eventName),
    eventLocation: str(parsed.eventLocation),
    saleMethod: saleMethod(parsed.saleMethod),
    postTypes: postTypes(parsed.postTypes),
    entryStartAt: str(parsed.entryStartAt),
    entryDeadlineAt: str(parsed.entryDeadlineAt),
    winnerAnnounceAt: str(parsed.winnerAnnounceAt),
    saleStartAt: str(parsed.saleStartAt),
    saleEndAt: str(parsed.saleEndAt),
    eventStartAt: str(parsed.eventStartAt),
    eventEndAt: str(parsed.eventEndAt),
    shipAt: str(parsed.shipAt),
    price: str(parsed.price),
    currency: str(parsed.currency),
    quantity: str(parsed.quantity),
    purchaseLimit: str(parsed.purchaseLimit),
    entryConditions: str(parsed.entryConditions),
    targetRegion: str(parsed.targetRegion),
    purchaseUrl: str(parsed.purchaseUrl),
    entryUrl: str(parsed.entryUrl),
    hashtags: strArr(parsed.hashtags),
  }
}
