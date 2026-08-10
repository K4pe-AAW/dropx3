import { AffiliateLink } from "./types"

/**
 * アフィリエイトリンクに必須のrel属性。
 * - sponsored: Googleに広告/成果報酬リンクであることを伝える
 * - nofollow: 念のため二重で明示
 * - noopener noreferrer: window.opener経由の脆弱性とリファラ漏洩を防ぐ
 */
export const AFFILIATE_REL = "sponsored nofollow noopener noreferrer"

/** http(s)以外のスキーム(javascript:, data: 等)を弾く。AI下書きや外部データ由来のURLを描画する前の最終防衛線 */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}

export function sanitizeAffiliateLinks(links: AffiliateLink[]): AffiliateLink[] {
  return links.filter((link) => isSafeExternalUrl(link.url))
}

/** カテゴリ名だけの検索語("スニーカー"等)は商品との関連性が薄いため使用禁止にする */
const BANNED_GENERIC_QUERIES = new Set(["スニーカー", "靴", "シューズ", "ファッション", "服", "アパレル"])

/**
 * メルカリ検索アフィリエイトリンクを作る。queryは商品名・型番等、具体的な検索語であること。
 * カテゴリ名単体("スニーカー"等)は関連性の低い検索結果しか返さないため明示的に拒否する
 * (呼び出し側のバグで"スニーカー"がハードコードされ全記事に同じリンクが付いていた実例があるため)。
 */
export function buildMercariSearchLink(query: string): AffiliateLink {
  const trimmed = query.trim()
  if (!trimmed || BANNED_GENERIC_QUERIES.has(trimmed)) {
    throw new Error(`buildMercariSearchLink: query is missing or too generic: ${JSON.stringify(query)}`)
  }
  const target = `https://jp.mercari.com/search?keyword=${encodeURIComponent(trimmed)}`
  return {
    label: "メルカリで探す",
    retailer: "メルカリ",
    url: `https://px.a8.net/svt/ejp?a8mat=4BA1PB+31JS36+5LNQ+BW8O2&a8ejpredirect=${encodeURIComponent(target)}`,
  }
}
