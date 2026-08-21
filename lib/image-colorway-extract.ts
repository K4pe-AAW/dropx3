import { getOpenAIClient } from "./openai-client"
import { siteConfig } from "./site-config"
import { isSafeExternalUrl } from "./affiliate"
import { sanitizeSuggestedColorways } from "./ai-draft"
import type { ColorwayInfo } from "./types"

/**
 * 「商品画像・カラーバリエーション」表への入力を、貼り付けたテキストからAIに読み取らせて
 * 自動で振り分けるための機能。商品ページのコピペ・メモ等、形式を問わない自由記述のテキストから、
 * 色ごとの型番/価格/サイズ/発売日と、色に紐付かない画像URLを構造化して抜き出す。
 * 画像URLはテキスト中に実際に書かれているものだけを拾い、AIに推測させない(捏造防止)。
 */
const SYSTEM_PROMPT = `あなたは${siteConfig.name}の編集者です。ユーザーが貼り付けたテキスト(商品ページからの
コピペ、SNSキャプション、メモ等、形式は問わない自由記述)から、商品の画像・カラー展開に関する情報を
読み取り、構造化して抜き出してください。

読み取る対象:
- カラー展開: 色名ごとの型番/品番・価格・サイズ展開・発売日・取扱店。テキストにその色専用の画像URL
  (http(s)から始まる実際のURL文字列)が書かれていればそれも拾う。
- それ以外の画像URL: 特定の色に紐付かない画像URLがあれば、ギャラリー画像として拾う。

【重要】テキストに書かれていない情報を新たに創作しないこと。項目が無ければキー自体を省略する。
画像URLはテキスト中に実際にhttp(s)から始まるURL文字列として書かれている場合のみ拾い、
ファイル名やブランド名から推測・創作しない。カラー名や型番等も同様に、テキストに無いものを書き足さない。

必ず以下のJSON形式のみを返してください。前後に説明文は不要です。
{
  "colorways": [
    {
      "colorName": "カラー名(テキストに記載があれば)",
      "styleCode": "型番/品番(あれば、無ければキー自体を省略)",
      "price": "価格(テキストの表記そのまま。無ければキー自体を省略)",
      "size": "サイズ展開(あれば、無ければキー自体を省略)",
      "releaseDate": "発売日(テキストの表記そのまま。無ければキー自体を省略)",
      "image": "その色専用の画像URL(テキストに実際に書かれていれば。無ければキー自体を省略)"
    }
  ],
  "galleryImages": [
    { "url": "特定の色に紐付かない画像URL", "alt": "画像の内容が分かる短い説明" }
  ]
}`

type ExtractAiResult = {
  colorways?: unknown
  galleryImages?: { url?: string; alt?: string }[]
}

export type ExtractedImageColorwayInfo = {
  colorways: ColorwayInfo[]
  galleryImages: { url: string; alt: string }[]
}

export async function extractImageColorwayInfo(text: string): Promise<ExtractedImageColorwayInfo> {
  if (!text.trim()) throw new Error("テキストを入力してください")

  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text.trim().slice(0, 6000) },
    ],
    temperature: 0.2,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("OpenAIから空のレスポンスが返されました")
  const result: ExtractAiResult = JSON.parse(content)

  const colorways = sanitizeSuggestedColorways(result.colorways)
  const galleryImages = Array.isArray(result.galleryImages)
    ? result.galleryImages
        .filter((g): g is { url: string; alt?: string } => typeof g?.url === "string" && isSafeExternalUrl(g.url))
        .map((g) => ({ url: g.url, alt: typeof g.alt === "string" && g.alt.trim() ? g.alt.trim() : "" }))
    : []

  if (colorways.length === 0 && galleryImages.length === 0) {
    throw new Error("画像URL・カラー情報を読み取れませんでした")
  }

  return { colorways, galleryImages }
}
