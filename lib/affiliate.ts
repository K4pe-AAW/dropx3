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
 * スニダン(SNKRDUNK)検索アフィリエイトリンクを作る(A8.net、プログラムID s00000021512002に提携済み)。
 * a8matはA8.netの「商品リンク作成」→「テキスト生成」で実際に発行した値をそのまま使う
 * (buildMercariSearchLinkと同じ、サイト+プログラム単位で固定のコード+検索キーワードだけ変わる
 * a8ejpredirect、という構造)。
 */
export function buildSnkrdunkSearchLink(query: string): AffiliateLink {
  const trimmed = query.trim()
  if (!trimmed || BANNED_GENERIC_QUERIES.has(trimmed)) {
    throw new Error(`buildSnkrdunkSearchLink: query is missing or too generic: ${JSON.stringify(query)}`)
  }
  const target = `https://snkrdunk.com/search?keywords=${encodeURIComponent(trimmed)}`
  return {
    label: "スニダンで探す",
    retailer: "SNKRDUNK",
    url: `https://px.a8.net/svt/ejp?a8mat=4BA1PB+28DJG2+4LZK+HUKPU&a8ejpredirect=${encodeURIComponent(target)}`,
  }
}

/**
 * 楽天市場検索アフィリエイトリンクを作る(A8.net経由の「楽天アフィリエイト」プログラム、
 * プログラムID s00000011623001に提携済み)。他の店舗と違い、A8.net(rpx.a8.net)から
 * 楽天自身の中継ドメイン(hb.afl.rakuten.co.jp)へさらにリダイレクトする2段構造。
 * hb.afl.rakuten.co.jp以下のパス("hgc/{id}/{メディアID}_{a8mat}")とa8mat・rakuten=yは
 * サイト+プログラム単位で固定(A8.netの「商品リンク作成」→「テキスト生成」で実際に発行した
 * 値をそのまま使用)、pc=/m=パラメータの飛び先URLだけがリンクごとに変わる。
 */
export function buildRakutenSearchLink(query: string): AffiliateLink {
  const trimmed = query.trim()
  if (!trimmed || BANNED_GENERIC_QUERIES.has(trimmed)) {
    throw new Error(`buildRakutenSearchLink: query is missing or too generic: ${JSON.stringify(query)}`)
  }
  const target = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(trimmed)}/`
  const rakutenRedirect = `http://hb.afl.rakuten.co.jp/hgc/0ea62065.34400275.0ea62066.204f04c0/a26080942703_4BA1PA_CFPZOY_2HOM_BW8O1?pc=${encodeURIComponent(target)}&m=${encodeURIComponent(target)}`
  return {
    label: "楽天市場で探す",
    retailer: "楽天市場",
    url: `https://rpx.a8.net/svt/ejp?a8mat=4BA1PA+CFPZOY+2HOM+BW8O1&rakuten=y&a8ejpredirect=${encodeURIComponent(rakutenRedirect)}`,
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
  { label: "スニダンで探す", retailer: "SNKRDUNK", build: buildSnkrdunkSearchLink },
  { label: "楽天市場で探す", retailer: "楽天市場", build: buildRakutenSearchLink },
  { label: "ZOZOTOWNで見る", retailer: "ZOZOTOWN" },
  // Amazonアソシエイトのトラッキングタグが無いため、他店舗のようなURL自動生成はまだできない
  // (2026-08-22時点)。タグを取得したらbuildAmazonSearchLinkを追加してbuildを持たせる。
  { label: "Amazonで見る", retailer: "Amazon" },
]

/** 表記ゆれ(カタカナ/英字/「!」の有無等)を吸収するための店舗名エイリアス。上のQUICK_AFFILIATE_RETAILERSと
 * 対応関係にあるが、AIが抽出した自由記述のretailerName(例: "Yahoo!ショッピング" "ヤフーショッピング")と
 * 突き合わせる用途のため別で持つ */
const RETAILER_URL_ALIASES: { aliases: string[]; build: (query: string) => AffiliateLink }[] = [
  { aliases: ["メルカリ", "mercari"], build: buildMercariSearchLink },
  { aliases: ["yahoo", "ヤフーショッピング", "Yahoo!ショッピング"], build: buildYahooShoppingSearchLink },
  { aliases: ["スニダン", "snkrdunk"], build: buildSnkrdunkSearchLink },
  { aliases: ["楽天"], build: buildRakutenSearchLink },
]

/**
 * 店舗名(表記ゆれあり)から、既にDROP DROP DROP自身が提携済みのASPリンクbuilderを引く。
 * 一致しなければundefined——未対応の店舗や出典元のURLをそのまま使ってURLを捏造しないため、
 * 呼び出し側は必ずundefinedを許容し、その場合はURL欄を空のまま(人間が手動で確認して追加)にすること。
 */
export function resolveKnownAffiliateBuilder(retailerName: string): ((query: string) => AffiliateLink) | undefined {
  const lower = retailerName.toLowerCase()
  const found = RETAILER_URL_ALIASES.find((r) => r.aliases.some((a) => lower.includes(a.toLowerCase())))
  return found?.build
}
