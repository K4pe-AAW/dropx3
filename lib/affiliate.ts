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

/**
 * Yahoo!ショッピング検索アフィリエイトリンクを作る(ValueCommerce、プログラムID2025875に提携済み)。
 * sid/pidはARKnets検索リンク発行時にValueCommerce管理画面から実際に取得済みの値を再利用する
 * (このsid+pidの組み合わせはサイト+プログラム単位で固定、vc_urlの飛び先だけがリンクごとに変わる
 * ——buildMercariSearchLinkのa8matと同じ考え方)。
 */
export function buildYahooShoppingSearchLink(query: string): AffiliateLink {
  const trimmed = query.trim()
  if (!trimmed || BANNED_GENERIC_QUERIES.has(trimmed)) {
    throw new Error(`buildYahooShoppingSearchLink: query is missing or too generic: ${JSON.stringify(query)}`)
  }
  const target = `https://shopping.yahoo.co.jp/search?p=${encodeURIComponent(trimmed)}`
  return {
    label: "Yahoo!ショッピングで探す",
    retailer: "Yahoo!ショッピング",
    url: `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3778012&pid=892676774&vc_url=${encodeURIComponent(target)}`,
  }
}

/**
 * 記事編集画面(PublishForm/EditArticleForm)で共有するクイック追加店舗リスト。1箇所にまとめておき、
 * 自動化できる店舗が増えた際に両フォームを個別に直す必要が無いようにする。
 * buildを持つ店舗は実際のトラッキングURLまで自動生成できる(検索キーワードだけ変わる固定コードの
 * リンクを再利用しているため)。buildが無い店舗は文言・店舗名のみ自動入力し、URLは各ASP管理画面で
 * 発行して手動で貼ってもらう(実在しないトラッキングコードを捏造しないため)。
 */
export const QUICK_AFFILIATE_RETAILERS: { label: string; retailer: string; build?: (query: string) => AffiliateLink }[] = [
  { label: "メルカリで探す", retailer: "メルカリ", build: buildMercariSearchLink },
  { label: "Yahoo!ショッピングで探す", retailer: "Yahoo!ショッピング", build: buildYahooShoppingSearchLink },
  { label: "楽天市場で見る", retailer: "楽天市場" },
  { label: "ZOZOTOWNで見る", retailer: "ZOZOTOWN" },
  { label: "スニダンで見る", retailer: "SNKRDUNK" },
]
