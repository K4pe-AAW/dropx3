import { getOpenAIClient } from "./openai-client"
import { siteConfig } from "./site-config"
import { fetchPageText } from "./source-watch/fetchers/html"
import { isSafeExternalUrl } from "./affiliate"
import { sanitizeSuggestedColorways } from "./ai-draft"
import type { ColorwayInfo, SourceRef } from "./types"

/**
 * 下書きレビュー画面での「URLでブラッシュアップ」用。第三者メディアの記事をもとに書かれた下書きを、
 * 別のページ(公式サイトとは限らない — より詳しいニュース記事等でもよい)の内容で精度・情報量を
 * 上げる(draftFromRawItemの「ゼロから書く」用プロンプトとは別に、「今ある下書きを直す」ための
 * プロンプトを持つ)。当初は「公式サイト限定」としていたが、実際には公式サイトが無い/見つからない
 * ブランドも多く制約が強すぎたため、参考ページ全般を対象にする形に変更した(2026-08-21)。
 */
const SYSTEM_PROMPT = `あなたはストリートファッション/スニーカーニュースメディア「${siteConfig.name}」の編集者です。
今回はゼロから記事を書くのではなく、既に書かれている下書きを、別の参考ページの内容を踏まえてブラッシュアップ
(精度・情報量を上げる)する作業です。下書きの文体・温度感は保ったまま、参考ページの本文に書かれている事実
(型番・価格・サイズ展開・発売日・素材・カラー展開等)で下書きに不足している部分を補い、下書きの内容が
参考ページの記載とはっきり食い違っている場合は、より具体的・一次情報に近そうな側を優先して書き直してください。

【重要】参考ページの本文に書かれていない情報を新たに創作しないこと。下書きに既にある情報で、参考ページの
本文からは真偽を確認できないものは、無理に削らずそのまま残してよい(参考ページに書かれていないからといって
下書きの記述を否定しない — あくまで「補う」作業であって「検証して否定する」作業ではない)。
発売日の年やGORE-TEX等の具体的な素材/技術名を、参考ページ本文に明記が無いのに推測で書き加えることは禁止。

情報源が海外サイト・英語(または他の外国語)であっても、title/excerpt/bodyParagraphsは必ず完全に日本語で
書くこと。商品名・モデル名・カラー名等の固有名詞はそのまま表記してよい。

必ず以下のJSON形式のみを返してください。前後に説明文は不要です。`

type BrushUpAiResult = {
  title?: string
  excerpt?: string
  bodyParagraphs?: string[]
  suggestedColorways?: unknown
}

export type BrushUpCurrentDraft = {
  title: string
  excerpt: string
  bodyParagraphs: string[]
  colorways: { colorName: string; styleCode?: string; price?: string; size?: string; releaseDate?: string }[]
}

export type BrushUpResult = {
  title: string
  excerpt: string
  bodyParagraphs: string[]
  colorways: ColorwayInfo[]
  sourceRef: SourceRef
  imageCandidates: string[]
}

function buildUserPrompt(current: BrushUpCurrentDraft, sourceUrl: string, sourceText: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `本日の日付: ${today}(西暦の年はこれを基準にすること。あなたの学習データにある年を使わない)

【現在の下書き】
タイトル: ${current.title}
要約: ${current.excerpt}
本文:
${current.bodyParagraphs.join("\n\n")}
カラー展開(構造化データ): ${JSON.stringify(current.colorways)}

【参考ページ】
URL: ${sourceUrl}
本文抜粋: ${sourceText || "(本文を取得できませんでした。タイトル等わずかな情報のみで判断してください)"}

以下のJSONで、上記の下書きをブラッシュアップした結果を返してください:
{
  "title": "ブラッシュアップ後のタイトル(参考ページの情報で改善点が無ければ現在のタイトルをそのまま返す)",
  "excerpt": "ブラッシュアップ後の要約(100〜160文字)",
  "bodyParagraphs": ["段落1", "段落2", "...", "(該当すれば)[アイテム情報]", "(該当すれば)商品名：〇〇", "..."],
  "suggestedColorways": [
    {
      "colorName": "カラー名",
      "styleCode": "型番/品番(参考ページに記載があれば。無ければキー自体を省略)",
      "price": "価格(参考ページの表記そのまま。無ければキー自体を省略)",
      "size": "サイズ展開(あれば、無ければキー自体を省略)",
      "releaseDate": "発売日(参考ページの表記そのまま。年は実際に書かれている場合のみ。無ければキー自体を省略)"
    }
  ]
}

注意:
- bodyParagraphsの[アイテム情報]ブロックは、参考ページの記載を踏まえて更新すること(既存の下書きに
  [アイテム情報]ブロックがあれば書き換え、無くて参考ページに情報があれば新しく追加してよい)。
- suggestedColorwaysは、参考ページに記載のあるカラー展開で置き換えること。下書きに無かった色や、
  型番・価格・発売日等が下書きより詳しく分かる場合はそちらを優先する。参考ページにカラー展開の記載が
  無ければ、下書きのcolorwaysをそのまま返してよい。
- 参考ページの文章をそのまま転記せず、必ず${siteConfig.name}としての独自の表現に書き直すこと。`
}

export async function brushUpDraftWithUrl(current: BrushUpCurrentDraft, sourceUrl: string): Promise<BrushUpResult> {
  if (!isSafeExternalUrl(sourceUrl)) throw new Error("URLの形式が正しくありません")

  const page = await fetchPageText(sourceUrl)
  if (!page?.title && !page?.text) throw new Error("ページの取得に失敗しました")

  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(current, sourceUrl, page.text ?? "") },
    ],
    temperature: 0.5,
    max_tokens: 2500,
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("OpenAIから空のレスポンスが返されました")
  const result: BrushUpAiResult = JSON.parse(content)

  const hostname = (() => {
    try {
      return new URL(sourceUrl).hostname
    } catch {
      return "参考ページ"
    }
  })()

  const colorways = sanitizeSuggestedColorways(result.suggestedColorways)

  return {
    title: typeof result.title === "string" && result.title.trim() ? result.title.trim() : current.title,
    excerpt: typeof result.excerpt === "string" && result.excerpt.trim() ? result.excerpt.trim() : current.excerpt,
    bodyParagraphs:
      Array.isArray(result.bodyParagraphs) && result.bodyParagraphs.length > 0
        ? result.bodyParagraphs
        : current.bodyParagraphs,
    colorways: colorways.length > 0 ? colorways : [],
    sourceRef: { name: hostname, url: sourceUrl },
    imageCandidates: page.imageCandidates,
  }
}
