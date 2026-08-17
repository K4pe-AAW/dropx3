import { RawItem, Draft, Category, OfficialLink, PurchaseChannelInfo } from "./types"
import { generateId } from "./storage"
import { siteConfig } from "./site-config"
import { getOpenAIClient } from "./openai-client"

const CATEGORY_SLUGS = siteConfig.categories.map((c) => c.slug)
const DEFAULT_CATEGORY: Category = "sneaker"

/**
 * YouTube動画のURLからvideoIdを取り出す。RawItem.sourceUrlがYouTubeチャンネルRSS由来の場合のみ
 * 一致する(lib/collector.tsがそのままlinkをsourceUrlに使っているため)。通常動画(/watch?v=…)と
 * ショート動画(/shorts/…)の両方に対応する(登録チャンネルの一部はショート中心のため)——
 * どちらの形式でも同じvideoIdの仕組みで、YouTube公式の埋め込みプレイヤー(/embed/{videoId})が
 * 共通して使える。動画自体のサムネイルはYouTube公式CDNの直リンクなら自己ホスト不要で使える方針
 * (lib/sources.tsのYOUTUBE_SOURCESコメント参照)なので、videoIdが取れたらカバー画像も自動で埋める。
 */
export function extractYoutubeVideoId(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== "www.youtube.com" && parsed.hostname !== "youtube.com") return undefined
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v") ?? undefined
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/)
    if (shortsMatch) return shortsMatch[1]
    return undefined
  } catch {
    return undefined
  }
}

const SYSTEM_PROMPT = `あなたはストリートファッション/スニーカーニュースメディア「${siteConfig.name}」の編集者です。
渡される情報(タイトル・抜粋・出典)は他メディアの記事です。丸写しはせず、事実関係だけを踏まえて
${siteConfig.name}独自の文章としてゼロから書き直してください。出典の文章表現をそのまま流用してはいけません。

【重要】情報源が海外メディア・英語(または他の外国語)であっても、title/excerpt/bodyParagraphsは
必ず完全に日本語で書くこと。商品名・モデル名・カラー名等の固有名詞(例: "Air Max"、"Black/Tough Red")
はそのまま表記してよいが、それ以外の英語の単語・文をそのまま残したり、英語の一文をそのまま
埋め込んだりしないこと。

文体について:
- 通信社の速報のような無機質な事実の羅列は禁止。実際にそのブランド/カルチャーが好きな編集者が、
  自分の言葉で語りかけるような温度感で書くこと。
- 「正直これは欲しい」「発売が待ちきれない」「一目見てテンションが上がった」のような、
  書き手の感情・主観がにじむ表現を自然に混ぜること。ただし誇張しすぎて事実と乖離しないよう注意。
- 硬い体言止めの連発や「〜が発表された。」の機械的な繰り返しを避け、文末表現にリズムの変化をつける。
- 読者に語りかける口調(「〜のはうれしいポイント」「〜な人にはたまらないはず」等)を適度に使う。

必ず以下のJSON形式のみを返してください。前後に説明文は不要です。`

type SuggestedPurchaseChannel = {
  retailerName: string
  channelType: "official" | "secondary"
  saleMethod: "regular" | "lottery" | "unknown"
  date?: string
}

type DraftResult = {
  title: string
  excerpt: string
  bodyParagraphs: string[]
  category: Category
  brands: string[]
  tags: string[]
  suggestedAffiliateSearch: string[]
  suggestedPurchaseChannels?: SuggestedPurchaseChannel[]
}

const CHANNEL_TYPES = new Set(["official", "secondary"])
const SALE_METHODS = new Set(["regular", "lottery", "unknown"])

/** AIの出力を信用せず型を検証する(URLは意図的に受け付けない——公開前に人間が実際のリンクを付ける運用) */
function sanitizeSuggestedPurchaseChannels(input: unknown): PurchaseChannelInfo[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      retailerName: typeof c.retailerName === "string" ? c.retailerName.trim() : "",
      channelType: CHANNEL_TYPES.has(c.channelType as string) ? (c.channelType as PurchaseChannelInfo["channelType"]) : "official",
      saleMethod: SALE_METHODS.has(c.saleMethod as string) ? (c.saleMethod as PurchaseChannelInfo["saleMethod"]) : "unknown",
      ...(typeof c.date === "string" && c.date.trim() ? { date: c.date.trim() } : {}),
    }))
    .filter((c) => c.retailerName)
}

function buildUserPrompt(item: RawItem): string {
  return `以下のニュースの要点をもとに、${siteConfig.name}向けの記事下書きを作成してください。

タイトル: ${item.title}
出典: ${item.sourceName}
抜粋: ${item.snippet ?? "(本文抜粋なし。タイトルの情報のみで一般論として書いてください)"}

【重要・必須】抜粋に以下の具体的な情報が含まれている場合、必ずbodyParagraphsの本文中に地の文として
そのまま明記すること(タイトルにしか出てこない、または「新作」「今作」のようにぼかしたまま終わるのは不可)。
- 型番/品番(例: CK9246-400、IM9616-001のような英数字コード)や正式な商品名
- カラー展開(複数色ある場合は色名を列挙し、色ごとに発売日や取扱店が違うならそれも書く)
- 価格・サイズ展開・素材/機能(GORE-TEX、Vibram等の具体的な仕様)
抜粋にこれらの記載が一切ない項目は、存在しない情報を作り出さず、素直に省略してよい。

【重要・必須】抜粋の中に「販売店舗」「取扱店」「オンラインリンク」等の見出しの後に具体的な店舗名
(ブランド公式サイト、mita sneakers、メルカリ、StockX等)が列挙されている場合、suggestedPurchaseChannels
にその店舗名を拾うこと。店舗名の列挙が無ければ空配列のままにする(店舗名を推測・創作しない)。

以下のJSONで返してください:
{
  "title": "${siteConfig.name}らしい独自タイトル(40文字前後)",
  "excerpt": "記事一覧に出す1文要約(50文字前後)",
  "bodyParagraphs": ["段落1", "段落2", "段落3", "段落4", "段落5"],
  "category": "商品として最も近いものを ${CATEGORY_SLUGS.join(" / ")} から1つ選ぶ（tops=トップス, pants=パンツ, jacket=ジャケット/コート/アウター, boots=ブーツ/革靴, sneaker=スニーカー, accessory=バッグ/アクセサリー/バッグ以外の小物, figure=フィギュア/コレクタブル, vintage=古着/ヴィンテージ品, youtube=YouTube動画の紹介記事。新品ならジャンル別のカテゴリを優先し、古着・中古品として紹介する記事のみvintage、動画コンテンツの紹介記事のみyoutubeを選ぶ。どれにも当てはまらなければ最も近いものを選ぶ）",
  "brands": ["関連ブランド名"],
  "tags": ["タグ1", "タグ2"],
  "suggestedAffiliateSearch": ["A8.net/バリューコマースで検索する際の商品名キーワード"],
  "suggestedPurchaseChannels": [
    {
      "retailerName": "抜粋に実際に名前が出てくる店舗名のみ(例: adidas公式オンライン、mita sneakers、メルカリ)",
      "channelType": "official(ブランド公式サイト/正規販売店) または secondary(セレクトショップ・フリマ・二次流通)",
      "saleMethod": "regular(通常販売) / lottery(抽選) / unknown(記載なし)",
      "date": "その店舗固有の発売日・応募期間があれば(無ければこのキー自体を省略)"
    }
  ]
}

注意:
- 実在しないアフィリエイトURLは絶対に生成しないこと(suggestedAffiliateSearchはあくまで検索キーワード)。
- suggestedPurchaseChannelsにURLを含めないこと(項目自体が存在しない)。実際の販売リンクは公開前に人間が確認して付ける。店舗名の記載が抜粋に無ければ空配列のままにする。
- 価格や発売日など、抜粋に書かれていない具体的な数値を断定的に書かないこと。不明な場合は「詳細は続報を待ちたい」のようにぼかす。
- 出典記事の文章をそのまま使わず、必ず独自の表現で書き直すこと。
- bodyParagraphsは4〜5段落、合計800〜1200字程度を目安に厚みを持たせること。単なる事実の要約で終わらせず、
  背景・見どころ・着こなしや使い方のイメージ・編集部としての感想や期待感など、段落ごとに違う角度の内容を入れて膨らませる。
- 抜粋の情報量が少ない場合でも、業界の一般的な文脈やブランドの背景など、事実として妥当な範囲で肉付けしてよい
  (ただし価格・発売日等の具体的数値の捏造は禁止)。`
}

export async function draftFromRawItem(item: RawItem): Promise<Draft> {
  const openai = getOpenAIClient()

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(item) },
    ],
    temperature: 0.7,
    max_tokens: 2500,
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("OpenAIから空のレスポンスが返されました")

  const result: DraftResult = JSON.parse(content)
  const youtubeVideoId = extractYoutubeVideoId(item.sourceUrl)
  const suggestedPurchaseChannels = sanitizeSuggestedPurchaseChannels(result.suggestedPurchaseChannels)

  return {
    id: generateId(`${item.sourceUrl}-draft`),
    status: "pending",
    title: result.title || item.title,
    excerpt: result.excerpt || "",
    bodyParagraphs: Array.isArray(result.bodyParagraphs) ? result.bodyParagraphs : [],
    category: CATEGORY_SLUGS.includes(result.category) ? result.category : DEFAULT_CATEGORY,
    brands: Array.isArray(result.brands) ? result.brands : [],
    tags: Array.isArray(result.tags) ? result.tags : [],
    suggestedAffiliateSearch: Array.isArray(result.suggestedAffiliateSearch)
      ? result.suggestedAffiliateSearch
      : [],
    ...(suggestedPurchaseChannels.length > 0 ? { suggestedPurchaseChannels } : {}),
    sourceRefs: [{ name: item.sourceName, url: item.sourceUrl }],
    createdAt: new Date().toISOString(),
    ...(youtubeVideoId
      ? {
          suggestedYoutubeVideoId: youtubeVideoId,
          suggestedCoverImage: `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`,
          // カテゴリ判定がyoutube以外(商品ジャンル)になった場合でも動画へのリンクは必ず残す
          suggestedOfficialLinks: [
            { label: `${item.sourceName}で見る`, url: item.sourceUrl } satisfies OfficialLink,
          ],
        }
      : {}),
  }
}

export async function draftFromRawItems(
  items: RawItem[],
  concurrency = 3
): Promise<{ drafts: Draft[]; errors: string[] }> {
  const drafts: Draft[] = []
  const errors: string[] = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const settled = await Promise.allSettled(batch.map((item) => draftFromRawItem(item)))
    for (const result of settled) {
      if (result.status === "fulfilled") drafts.push(result.value)
      else errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason))
    }
  }

  return { drafts, errors }
}
