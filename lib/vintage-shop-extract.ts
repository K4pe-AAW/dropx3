import { getOpenAIClient } from "@/lib/openai-client"

/**
 * 画像使用許諾済みの古着屋(tonari/ROOM)向け。人間がInstagramで見た投稿のキャプション本文を
 * 貼り付けたものから、記事の下書き文章を生成する。social-extract.tsと同じく「本文に無い情報は
 * 補完・推測しない」という規律を徹底する(価格の推測・誇張表現はしない)。
 * クラウド自動化ルーティン(dropwire-vintage-shop-daily)がInstagramへ到達できない
 * (ネットワークegressプロキシでブロック確認済み、2026-08-12)ため、人間が貼った本文から
 * AIが下書きを組み立て、最終的な公開前レビューは必ず人間が行う運用に切り替えた。
 */
export type ShopPostDraft = {
  title: string
  excerpt: string
  bodyParagraphs: string[]
  mercariSearchQuery: string
  tags: string[]
}

const EMPTY_DRAFT: ShopPostDraft = { title: "", excerpt: "", bodyParagraphs: [], mercariSearchQuery: "", tags: ["古着"] }

const SYSTEM_PROMPT = `あなたは古着屋のInstagram投稿から、ファッションメディア記事の下書きを書くアシスタントです。

絶対に守るルール:
- 渡されるキャプション本文に書かれていない情報(価格・素材・年代等)を推測・捏造しない。書かれていなければ触れない。
- SOLD・売り切れ等の表記があれば隠さず本文に明記する(一点物の入荷情報として、売り切れでも紹介する価値はある)。
- 誇張表現や煽り文句を使わず、実際の投稿内容に基づいて淡々と紹介する。
- bodyParagraphsは2〜3段落、各段落は2〜4文程度の日本語。1段落目で商品(アイテム名・特徴)を紹介し、
  価格等の情報があれば触れる。最後の段落でショップの簡単な紹介(営業時間・予約制かどうか等、
  本文から分かる範囲のみ)を添える。分からない情報については書かない。
- mercariSearchQueryは、その投稿の具体的な商品名(例: "HELMUT LANG デニムショーツ"、ブランドが
  分かれば"ブランド名 アイテム名")。"古着"や"スニーカー"のようなカテゴリ名だけは不可。
- titleは30〜45文字程度で、ショップ名とアイテムの特徴を含める。

必ず以下のJSON形式のみを返してください。前後の説明文は不要です。`

function buildUserPrompt(shopLabel: string, caption: string, postUrl: string): string {
  return `ショップ名: ${shopLabel}
投稿URL: ${postUrl}

Instagramキャプション本文:
${caption}

次のJSON形式で返してください:
{
  "title": "記事タイトル",
  "excerpt": "1文の要約",
  "bodyParagraphs": ["段落1", "段落2", "段落3(任意)"],
  "mercariSearchQuery": "具体的な商品名",
  "tags": ["古着", "エリア名等"]
}`
}

export async function extractShopPostDraft(shopLabel: string, caption: string, postUrl: string): Promise<ShopPostDraft> {
  if (!caption.trim()) return EMPTY_DRAFT
  const openai = getOpenAIClient()

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(shopLabel, caption, postUrl) },
    ],
    temperature: 0.3,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  if (!content) return EMPTY_DRAFT

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content)
  } catch {
    return EMPTY_DRAFT
  }

  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : []

  return {
    title: str(parsed.title),
    excerpt: str(parsed.excerpt),
    bodyParagraphs: strArr(parsed.bodyParagraphs),
    mercariSearchQuery: str(parsed.mercariSearchQuery),
    tags: strArr(parsed.tags).length > 0 ? strArr(parsed.tags) : ["古着"],
  }
}
