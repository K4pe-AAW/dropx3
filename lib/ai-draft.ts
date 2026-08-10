import OpenAI from "openai"
import { RawItem, Draft, Category } from "./types"
import { generateId } from "./storage"
import { siteConfig } from "./site-config"

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set")
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}

const CATEGORY_SLUGS = siteConfig.categories.map((c) => c.slug)
const DEFAULT_CATEGORY: Category = "sneaker"

const SYSTEM_PROMPT = `あなたはストリートファッション/スニーカーニュースメディア「${siteConfig.name}」の編集者です。
渡される情報(タイトル・抜粋・出典)は他メディアの記事です。丸写しはせず、事実関係だけを踏まえて
${siteConfig.name}独自の文章としてゼロから書き直してください。出典の文章表現をそのまま流用してはいけません。

文体について:
- 通信社の速報のような無機質な事実の羅列は禁止。実際にそのブランド/カルチャーが好きな編集者が、
  自分の言葉で語りかけるような温度感で書くこと。
- 「正直これは欲しい」「発売が待ちきれない」「一目見てテンションが上がった」のような、
  書き手の感情・主観がにじむ表現を自然に混ぜること。ただし誇張しすぎて事実と乖離しないよう注意。
- 硬い体言止めの連発や「〜が発表された。」の機械的な繰り返しを避け、文末表現にリズムの変化をつける。
- 読者に語りかける口調(「〜のはうれしいポイント」「〜な人にはたまらないはず」等)を適度に使う。

必ず以下のJSON形式のみを返してください。前後に説明文は不要です。`

type DraftResult = {
  title: string
  excerpt: string
  bodyParagraphs: string[]
  category: Category
  brands: string[]
  tags: string[]
  suggestedAffiliateSearch: string[]
}

function buildUserPrompt(item: RawItem): string {
  return `以下のニュースの要点をもとに、${siteConfig.name}向けの記事下書きを作成してください。

タイトル: ${item.title}
出典: ${item.sourceName}
抜粋: ${item.snippet ?? "(本文抜粋なし。タイトルの情報のみで一般論として書いてください)"}

【重要・必須】タイトルや抜粋に型番/品番(例: CK9246-400、IM9616-001のような英数字コード)や
正式な商品名が含まれている場合、それらは必ずbodyParagraphsの本文中に地の文としてそのまま明記すること
(タイトルにしか出てこない、または本文中で「新作」「今作」のようにぼかしたまま終わるのは不可)。
抜粋に型番の記載が一切ない場合は、存在しない型番を作り出さず、素直に省略してよい。

以下のJSONで返してください:
{
  "title": "${siteConfig.name}らしい独自タイトル(40文字前後)",
  "excerpt": "記事一覧に出す1文要約(50文字前後)",
  "bodyParagraphs": ["段落1", "段落2", "段落3", "段落4", "段落5"],
  "category": "商品として最も近いものを ${CATEGORY_SLUGS.join(" / ")} から1つ選ぶ（tops=トップス, pants=パンツ, jacket=ジャケット/コート/アウター, boots=ブーツ/革靴, sneaker=スニーカー, accessory=バッグ/アクセサリー/バッグ以外の小物, figure=フィギュア/コレクタブル, vintage=古着/ヴィンテージ品, youtube=YouTube動画の紹介記事。新品ならジャンル別のカテゴリを優先し、古着・中古品として紹介する記事のみvintage、動画コンテンツの紹介記事のみyoutubeを選ぶ。どれにも当てはまらなければ最も近いものを選ぶ）",
  "brands": ["関連ブランド名"],
  "tags": ["タグ1", "タグ2"],
  "suggestedAffiliateSearch": ["A8.net/バリューコマースで検索する際の商品名キーワード"]
}

注意:
- 実在しないアフィリエイトURLは絶対に生成しないこと(suggestedAffiliateSearchはあくまで検索キーワード)。
- 価格や発売日など、抜粋に書かれていない具体的な数値を断定的に書かないこと。不明な場合は「詳細は続報を待ちたい」のようにぼかす。
- 出典記事の文章をそのまま使わず、必ず独自の表現で書き直すこと。
- bodyParagraphsは4〜5段落、合計800〜1200字程度を目安に厚みを持たせること。単なる事実の要約で終わらせず、
  背景・見どころ・着こなしや使い方のイメージ・編集部としての感想や期待感など、段落ごとに違う角度の内容を入れて膨らませる。
- 抜粋の情報量が少ない場合でも、業界の一般的な文脈やブランドの背景など、事実として妥当な範囲で肉付けしてよい
  (ただし価格・発売日等の具体的数値の捏造は禁止)。`
}

export async function draftFromRawItem(item: RawItem): Promise<Draft> {
  const openai = getClient()

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
    sourceRefs: [{ name: item.sourceName, url: item.sourceUrl }],
    createdAt: new Date().toISOString(),
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
