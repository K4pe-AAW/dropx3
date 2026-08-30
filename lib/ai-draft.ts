import { RawItem, Draft, Category, OfficialLink, PurchaseChannelInfo, ColorwayInfo, InformationStatus } from "./types"
import { generateId } from "./storage"
import { siteConfig } from "./site-config"
import { getOpenAIClient } from "./openai-client"
import { resolveKnownAffiliateBuilder, isSafeExternalUrl } from "./affiliate"
import { detectUnconfirmedStatus, ensureUnconfirmedTitle } from "./information-status"

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

情報の確度をofficial/report/rumor/leakの4段階で必ず分類してください。公式発表でない噂・リークを
確定情報のように断定してはいけません。rumor/leakではタイトルにも「噂」「リーク」「〜か」のいずれかを
入れ、本文末尾はブランドの正式発表・情報解禁を待つ趣旨で締めてください。AIが実際には体験していない
「履いてみた」「使ってみた」等の体験談や、根拠のない編集者の感情を創作してはいけません。

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
  url?: string
}

type SuggestedOfficialLink = { label: string; url: string }

type SuggestedColorway = {
  colorName?: string
  styleCode?: string
  price?: string
  size?: string
  releaseDate?: string
}

type DraftResult = {
  title: string
  excerpt: string
  bodyParagraphs: string[]
  category: Category
  informationStatus?: InformationStatus
  brands: string[]
  tags: string[]
  suggestedAffiliateSearch: string[]
  suggestedPurchaseChannels?: SuggestedPurchaseChannel[]
  suggestedOfficialLinks?: SuggestedOfficialLink[]
  suggestedColorways?: SuggestedColorway[]
}

const CHANNEL_TYPES = new Set(["official", "secondary"])
const SALE_METHODS = new Set(["regular", "lottery", "unknown"])

/** AIの出力を信用せず型を検証する(URLはAIには一切出力させていない——下でDROP DROP DROP自身の提携済みリンクのみ付与する) */
export function sanitizeSuggestedPurchaseChannels(
  input: unknown,
  allowedUrls: ReadonlySet<string> = new Set()
): PurchaseChannelInfo[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => {
      const url = typeof c.url === "string" ? c.url.trim() : ""
      return {
        retailerName: typeof c.retailerName === "string" ? c.retailerName.trim() : "",
        channelType: CHANNEL_TYPES.has(c.channelType as string) ? (c.channelType as PurchaseChannelInfo["channelType"]) : "official",
        saleMethod: SALE_METHODS.has(c.saleMethod as string) ? (c.saleMethod as PurchaseChannelInfo["saleMethod"]) : "unknown",
        ...(typeof c.date === "string" && c.date.trim() ? { date: c.date.trim() } : {}),
        ...(url && allowedUrls.has(url) ? { url } : {}),
      }
    })
    .filter((c) => c.retailerName)
}

/**
 * AIの出力を信用せず型とURLの安全性を検証する。抜粋(動画概要欄等)に実際に記載されているURLだけを
 * 転記させる想定で、AIが推測・創作したURLが紛れ込んでもisSafeExternalUrlでは弾けないため、
 * 最終的な正しさの担保はプロンプト側の「実際に書かれている場合のみ」という指示に依存する
 * (公開前に人間がレビューする前提であることも安全弁になっている)。
 */
function sanitizeSuggestedOfficialLinks(input: unknown): OfficialLink[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
    .map((l) => ({
      label: typeof l.label === "string" && l.label.trim() ? l.label.trim() : "公式サイトで見る",
      url: typeof l.url === "string" ? l.url.trim() : "",
    }))
    .filter((l) => l.url && isSafeExternalUrl(l.url))
}

/**
 * AIの出力を信用せず型を検証する。[アイテム情報]ブロック(bodyParagraphs内のプレーンテキスト)と
 * 同じ情報を構造化データ(Product+Offer、app/(site)/articles/[slug]/page.tsx参照)としても
 * 検索エンジン/AI検索に渡せるようにするためのフィールド。プレーンテキストと同じ「抜粋に無い
 * 情報は書かない」ルールをAI側に課しているが、最終的な正しさの担保は公開前の人間レビュー。
 * 全項目が空(colorNameすらない)の要素は構造化データとして無意味なため除外する。
 */
export function sanitizeSuggestedColorways(input: unknown): ColorwayInfo[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      colorName: typeof c.colorName === "string" ? c.colorName.trim() : "",
      ...(typeof c.styleCode === "string" && c.styleCode.trim() ? { styleCode: c.styleCode.trim() } : {}),
      ...(typeof c.price === "string" && c.price.trim() ? { price: c.price.trim() } : {}),
      ...(typeof c.size === "string" && c.size.trim() ? { size: c.size.trim() } : {}),
      ...(typeof c.releaseDate === "string" && c.releaseDate.trim() ? { releaseDate: c.releaseDate.trim() } : {}),
    }))
    .filter((c) => c.colorName || c.styleCode || c.price || c.releaseDate || c.size)
}

/**
 * 店舗名がメルカリ/Yahoo!ショッピング/スニダン/楽天市場等、DROP DROP DROP自身が既に提携済みのASPと
 * 一致する場合のみ、実際のトラッキングリンクを自動生成して付与する(出典元のURLは一切使わない
 * ——他媒体自身のアフィリエイトコードを再利用しない/実在しないURLを捏造しないの両方を守るため)。
 * 一致しない店舗(ブランド公式サイトや個別セレクトショップ等)はこれまで通りURL無しのまま返し、
 * 公開前に人間が確認して手動で付ける。
 */
function autoFillKnownChannelUrls(channels: PurchaseChannelInfo[], searchQuery: string | undefined): PurchaseChannelInfo[] {
  if (!searchQuery) return channels
  return channels.map((c) => {
    // 元ページから抽出できた店舗固有URLを、汎用アフィリエイト検索URLで上書きしない。
    if (c.url) return c
    const build = resolveKnownAffiliateBuilder(c.retailerName)
    if (!build) return c
    try {
      return { ...c, url: build(searchQuery).url }
    } catch {
      return c
    }
  })
}

function buildUserPrompt(item: RawItem): string {
  const today = new Date().toISOString().slice(0, 10)
  const commerceLinks = item.commerceLinkCandidates?.length
    ? item.commerceLinkCandidates.map((link) => `- ${link.label}: ${link.url}`).join("\n")
    : "(候補なし)"
  return `以下のニュースの要点をもとに、${siteConfig.name}向けの記事下書きを作成してください。

本日の日付: ${today}(西暦の年はこれを基準にすること。あなたの学習データにある年を使わない)
タイトル: ${item.title}
出典: ${item.sourceName}
抜粋: ${item.snippet ?? "(本文抜粋なし。タイトルの情報のみで一般論として書いてください)"}
元ページから機械抽出した販売・抽選リンク候補(URLはこの一覧からのみ使用可):
${commerceLinks}

抜粋先頭に「機械抽出した価格・発売日の根拠候補」がある場合、それは本文中で検出した候補です。
候補行と本文を照合し、対象商品の情報だと確認できた価格・発売日は必ず[アイテム情報]と
suggestedColorwaysの両方へ入れてください。別商品・関連記事・ナビゲーションの値なら採用しないでください。

【重要・必須】抜粋に以下のようなスペック情報が含まれている場合、タイトルにしか出てこない、または
「新作」「今作」のようにぼかしたまま終わるのは不可——必ずbodyParagraphsの最後に「[アイテム情報]」
から始まる箇条書きブロックとして明記すること(説明文の中に埋め込まず、1項目=1つの配列要素にする)。
- 商品名(正式名称)
- 型番/品番(例: CK9246-400、IM9616-001のような英数字コード)
- 価格
- サイズ展開
- 発売日(確定日でなくても「9月下旬」等の表現でよい。【重要】抜粋に「7月26日」のように月日しか
  書かれていない場合、西暦の年を付け足さず月日のみで書くこと。年を書いてよいのは、抜粋の中に
  その年が実際に文字として書かれている場合だけ。抜粋に無い年を、本日の日付からの推測であっても
  書き添えない — 迷ったら年を省略する方を選ぶ)
- 素材/機能(抜粋にその商品自体の仕様として明記されている場合のみ。【重要】GORE-TEX/Vibram等の
  具体的な技術名・ブランド名は、抜粋にその商品の仕様として文字で書かれている場合しか使ってはならない。
  「アウトドア系だからGORE-TEXを使っていそう」「スニーカーだからVibramソールかもしれない」のような、
  ジャンルや商品名からの連想・推測で技術名を書き添えるのは絶対禁止(存在しない仕様を事実として
  提示することになるため、発売日の年を捏造するのと同種の誤りとして扱う))
例(bodyParagraphsの末尾に追加する配列要素のイメージ):
["...それまでの説明段落...", "[アイテム情報]", "商品名：〇〇〇〇", "価格：¥24,200（税込）", "発売日：国内9月下旬"]
カラー展開が複数ある場合は、色名の列挙と色ごとの違いは通常の説明段落側で自然な文章として触れてよい
(この箇条書きブロックで色ごとに分けて列挙する必要はない)。抜粋に記載が無い項目は書かず省略し、
[アイテム情報]ブロックに書ける項目が1つも無ければブロックごと省略してよい(存在しない情報を作り出さない)。

【重要・必須】上記[アイテム情報]ブロックに何か1項目でも書いた場合、同じ内容をsuggestedColorwaysにも
構造化データとして重複で入れること(検索エンジン/AI検索が商品情報を直接読み取れるようにするため)。
[アイテム情報]ブロックとsuggestedColorwaysは常に同じ事実を指す——一方にだけ書いて他方を空にしない。
カラー展開が複数あり、それぞれ型番/価格が違うと抜粋から分かる場合は配列に複数要素を返してよい
(全カラー共通の情報しか無ければ要素1つでよい)。[アイテム情報]ブロック自体を省略した場合は
suggestedColorwaysも空配列のままにする。

【重要・必須】抜粋の中に「販売店舗」「取扱店」「オンラインリンク」等の見出しの後に具体的な店舗名
(ブランド公式サイト、mita sneakers、メルカリ、StockX等)が列挙されている場合、suggestedPurchaseChannels
にその店舗名を拾うこと。店舗名の列挙が無ければ空配列のままにする(店舗名を推測・創作しない)。

【動画紹介記事の場合・任意】抜粋がYouTube動画の概要欄で、紹介されているブランド/ショップの
公式サイトやオンラインストアのURL(http(s)から始まる実際のURL文字列)が明記されている場合、
suggestedOfficialLinksとしてそのURLとブランド/店舗名を拾うこと。「概要欄はこちら」「リンクはプロフィールから」
のような案内文だけでURL自体が本文に無い場合は拾わない(URLを推測・創作しない)。該当が無ければ空配列。

以下のJSONで返してください:
{
  "title": "${siteConfig.name}らしい独自タイトル(40文字前後)",
  "excerpt": "検索結果・SNSシェア時に表示される説明文(100〜160文字。記事一覧カードには表示されないため短く削る必要はない。何が起きたか+読みたくなる一言を含め、具体的な商品名・ブランド名を入れる)",
  "bodyParagraphs": ["段落1", "段落2", "段落3", "段落4", "段落5", "(該当すれば)[アイテム情報]", "(該当すれば)商品名：〇〇", "..."],
  "category": "商品として最も近いものを ${CATEGORY_SLUGS.join(" / ")} から1つ選ぶ（tops=トップス, pants=パンツ, jacket=ジャケット/コート/アウター, boots=ブーツ/革靴, sneaker=スニーカー, accessory=バッグ/アクセサリー/バッグ以外の小物, figure=フィギュア/コレクタブル, vintage=古着/ヴィンテージ品, youtube=YouTube動画の紹介記事。新品ならジャンル別のカテゴリを優先し、古着・中古品として紹介する記事のみvintage、動画コンテンツの紹介記事のみyoutubeを選ぶ。どれにも当てはまらなければ最も近いものを選ぶ）",
  "informationStatus": "official（ブランド・販売店の公式発表） / report（媒体による確認済み報道） / rumor（根拠はあるが未確認の噂） / leak（画像・型番・資料等が先行流出した未確認情報）のいずれか",
  "brands": ["関連ブランド名"],
  "tags": ["タグ1", "タグ2"],
  "suggestedAffiliateSearch": ["A8.net/バリューコマースで検索する際の商品名キーワード"],
  "suggestedPurchaseChannels": [
    {
      "retailerName": "抜粋に実際に名前が出てくる店舗名のみ(例: adidas公式オンライン、mita sneakers、メルカリ)",
      "channelType": "official(ブランド公式サイト/正規販売店) または secondary(セレクトショップ・フリマ・二次流通)",
      "saleMethod": "regular(通常販売) / lottery(抽選) / unknown(記載なし)",
      "date": "その店舗固有の発売日・応募期間があれば(無ければこのキー自体を省略)。年は抜粋に実際に書かれている場合のみ含める、月日しか無ければ月日のみ書く",
      "url": "上記の販売・抽選リンク候補に実在する、その店舗の購入・予約・抽選応募URL。該当候補が無ければキー自体を省略"
    }
  ],
  "suggestedOfficialLinks": [
    { "label": "ブランド/店舗名", "url": "抜粋に実際に記載されているそのブランド/店舗の公式URL" }
  ],
  "suggestedColorways": [
    {
      "colorName": "カラー名(抜粋に記載があれば。単色展開で色名の言及が無ければキー自体を省略)",
      "styleCode": "型番/品番(抜粋にあれば、無ければキー自体を省略)",
      "price": "価格(抜粋の表記そのまま。例: '¥24,200（税込）'。無ければキー自体を省略)",
      "size": "サイズ展開(抜粋にあれば、無ければキー自体を省略)",
      "releaseDate": "発売日(抜粋の表記そのまま。年は実際に書かれている場合のみ。無ければキー自体を省略)"
    }
  ]
}

注意:
- 実在しないアフィリエイトURLは絶対に生成しないこと(suggestedAffiliateSearchはあくまで検索キーワード)。
- suggestedPurchaseChannelsのurlは、上記の販売・抽選リンク候補に完全一致するURLだけを使うこと。店舗名やドメインから推測・創作しない。店舗名の記載が抜粋にもリンク候補にも無ければ空配列のままにする。
- suggestedOfficialLinksのurlは、抜粋の本文中に実際に存在するURL文字列をそのまま転記する場合のみ使うこと。ブランド名や店舗名からURLを推測して作らない(例: 「ブランド名.com」のような形で創作しない)。抜粋にURL自体が書かれていなければ空配列のままにする。
- 価格や発売日など、抜粋の中に実際に数字として書かれている情報は、見落とさず必ず使うこと(抜粋の後半や別の言い回し
  ——「税込」「◯◯円」「◯月◯日発売」等——で書かれている場合も含めてよく探すこと)。ぼかした表現で済ませてよいのは、
  抜粋を読んでも本当にその情報が存在しない場合だけであり、「抜粋にあるはずだが読み取れなかった」を理由にぼかすのは不可
  ——迷ったら抜粋を読み返して数字を探すこと。断定的に書いてよいのは抜粋に実際にある数値のみで、抜粋に無い数値を
  創作するのは引き続き禁止。本当に抜粋に記載が無い場合のみ「詳細は続報を待ちたい」のようにぼかす。
- suggestedColorwaysも同じ規律に従うこと。抜粋に無い型番・価格・発売日を構造化データにだけ書き添えるのは、
  bodyParagraphsで書くのと同じく捏造として扱う。分からない項目はキー自体を省略する。
- 発売日の「年」は特に注意すること。抜粋に月日しか書かれていない発売日に、あなたの判断で年を付け足すのは絶対禁止(過去の学習データにある年をそのまま使ってしまう典型的な誤りのため)。年が必要な文脈でも抜粋に年の記載が無ければ、年を省いた表現に留める。
- GORE-TEX・Vibram・Cordura等の具体的な素材/技術名も年と同じく特に注意すること。商品ジャンル(スニーカー・ブーツ・アウトドアウェア等)や商品名の響き(例:「ゴアドーム」)から「採用していそう」「使われている可能性がある」と推測で書き添えるのは絶対禁止。抜粋にその商品自身の仕様として明記されていない限り、素材・機能への言及自体を避け、一般的なデザイン・着こなし・背景の話に留めること。
- 出典記事の文章をそのまま使わず、必ず独自の表現で書き直すこと。
- rumor/leakは確定値として断定せず、タイトルと本文で未確認だと一目で分かるようにすること。本文末尾は「正式な情報解禁を待ちたい」趣旨で締めること。
- 実体験のない使用感・着用感・耐久性や、AIが創作した編集者の感情は書かないこと。デザイン上の見どころや確認済み事実として表現すること。
- excerptは3文構成にすること: 1文目「何が起きたか」、2文目「型番・価格・発売時期等の具体情報
  (抜粋にあるものだけ)」、3文目「読みたくなる一言」。3文とも書いた上で合計が120文字に届かなければ、
  2文目か3文目をさらに具体的に書き足して120〜160文字まで伸ばすこと。1〜2文・100文字未満で
  切り上げるのは禁止(以前の実装で50〜90文字程度の短い一文になりがちだったための明示的な修正)。
- bodyParagraphsの説明文部分(箇条書きの[アイテム情報]ブロックを除く)は4〜5段落、合計800〜1200字程度を
  目安に厚みを持たせること。単なる事実の要約で終わらせず、背景・見どころ・着こなしや使い方のイメージ・
  編集部としての感想や期待感など、段落ごとに違う角度の内容を入れて膨らませる。
- 抜粋の情報量が少ない場合でも、業界の一般的な文脈やブランドの背景など、事実として妥当な範囲で肉付けしてよい
  (ただし価格・発売日等の具体的数値や、GORE-TEX等の具体的な素材/技術名の捏造は禁止)。`
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
  const affiliateSearchKeyword = Array.isArray(result.suggestedAffiliateSearch) ? result.suggestedAffiliateSearch[0] : undefined
  const suggestedPurchaseChannels = autoFillKnownChannelUrls(
    sanitizeSuggestedPurchaseChannels(
      result.suggestedPurchaseChannels,
      new Set((item.commerceLinkCandidates ?? []).map((link) => link.url))
    ),
    affiliateSearchKeyword
  )
  // 概要欄等に実際に書かれていたブランド/店舗URL(あれば)。YouTube記事は「チャンネルで見る」の
  // 定番リンクを先頭に必ず残しつつ、紹介されたブランドのリンクをその後ろに続ける
  const brandLinksFromAi = sanitizeSuggestedOfficialLinks(result.suggestedOfficialLinks)
  const suggestedOfficialLinks = youtubeVideoId
    ? [{ label: `${item.sourceName}で見る`, url: item.sourceUrl } satisfies OfficialLink, ...brandLinksFromAi]
    : brandLinksFromAi
  const suggestedColorways = sanitizeSuggestedColorways(result.suggestedColorways)
  // YouTube動画は公式CDNのサムネイルを優先するため、それ以外の場合のみページから拾った画像候補を使う
  const pageImages = !youtubeVideoId ? (item.imageCandidates ?? []) : []
  const sourceDetectedStatus = detectUnconfirmedStatus(`${item.title}\n${item.snippet ?? ""}`)
  const informationStatus: InformationStatus = sourceDetectedStatus ?? (
    ["official", "report", "rumor", "leak"].includes(result.informationStatus ?? "")
      ? result.informationStatus!
      : "report"
  )
  const draftTitle = ensureUnconfirmedTitle(result.title || item.title, informationStatus)

  return {
    id: generateId(`${item.sourceUrl}-draft`),
    status: "pending",
    title: draftTitle,
    excerpt: result.excerpt || "",
    bodyParagraphs: Array.isArray(result.bodyParagraphs) ? result.bodyParagraphs : [],
    // youtubeVideoIdはsourceUrl自体から機械的に判定できるため、AIの自己申告(result.category)より
    // 優先する。逆(sourceUrlがYouTube動画でないのにAIが"youtube"を選ぶ誤判定)も同様に却下する
    // ——実際に商品ジャンルに当てはまらない記事(読書イベント、教育系ニュース等)がAIの判断で
    // 誤って"youtube"タブに紛れ込む不具合が発生していたための修正。
    category: youtubeVideoId
      ? "youtube"
      : CATEGORY_SLUGS.includes(result.category) && result.category !== "youtube"
        ? result.category
        : DEFAULT_CATEGORY,
    informationStatus,
    brands: Array.isArray(result.brands) ? result.brands : [],
    tags: Array.isArray(result.tags) ? result.tags : [],
    suggestedAffiliateSearch: Array.isArray(result.suggestedAffiliateSearch)
      ? result.suggestedAffiliateSearch
      : [],
    ...(suggestedPurchaseChannels.length > 0 ? { suggestedPurchaseChannels } : {}),
    ...(suggestedOfficialLinks.length > 0 ? { suggestedOfficialLinks } : {}),
    ...(suggestedColorways.length > 0 ? { suggestedColorways } : {}),
    sourceRefs: [{ name: item.sourceName, url: item.sourceUrl }],
    createdAt: new Date().toISOString(),
    sourcePublishedAt: item.publishedAt,
    // カテゴリ判定がyoutube以外(商品ジャンル)になった場合でも動画へのリンクは必ず残す
    ...(youtubeVideoId
      ? {
          suggestedYoutubeVideoId: youtubeVideoId,
          suggestedCoverImage: `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`,
        }
      : {}),
    // ページのog:image等から拾った候補。カバー画像必須欄を空のまま人力検索させていた分の穴埋め
    // (あくまで候補 — 権利元の確認や差し替えは引き続き人間がPublishFormで行う)
    ...(pageImages[0] ? { suggestedCoverImage: pageImages[0] } : {}),
    ...(pageImages.length > 1
      ? { suggestedGalleryImages: pageImages.slice(1).map((url) => ({ url, alt: draftTitle })) }
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
