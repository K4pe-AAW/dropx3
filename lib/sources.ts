export type SourceConfig = {
  name: string
  rssUrl: string
  siteUrl: string
}

export type BrandSource = {
  name: string
  url: string
  /** Instagram等、公式サイト以外に画像取得を確認済みの補助ソースがあれば */
  instagramUrl?: string
}

/**
 * 手動で記事化する際に参照するブランド公式サイト一覧。RSS収集(SOURCES)とは別枠。
 * 掲載画像がブランド自身の著作物（＝自社サイト上の自社製品画像）であることが自明なため、
 * 転載ではなく一次情報の保存・自己ホストとして扱える。追加時は必ずサイトを開いて
 * 「掲載画像に third-party の撮影クレジットが入っていないか」「そのブランド自身のドメイン/
 * 著作権表示か」を確認してから加えること（セレクトショップの取り扱いページ等、ブランド以外が
 * 運営するページは対象外）。
 */
export const DIRECT_BRAND_SOURCES: BrandSource[] = [
  { name: "AURALEE", url: "https://auralee.jp/" },
  { name: "MARKAWARE", url: "https://markaware.jp/" },
  { name: "ssstein", url: "https://ssstein.com/" },
  { name: "NICENESS", url: "https://www.niceness.jp/", instagramUrl: "https://www.instagram.com/niceness_official/" },
  { name: "KAPTAIN SUNSHINE", url: "https://kaptainsunshine.com/", instagramUrl: "https://www.instagram.com/kaptainsunshine/" },
  { name: "CLESSTE", url: "https://clesste.com/", instagramUrl: "https://www.instagram.com/the_clesste/" },
  { name: "ENNOY", url: "https://www.ennoy.pro/", instagramUrl: "https://www.instagram.com/ennoy_com/" },
  { name: "COVERCHORD", url: "https://coverchord.com/" },
  { name: "1LDK", url: "https://onlinestore.1ldkshop.com/" },
  { name: "ARKnets", url: "https://www.arknets.co.jp/" },
  { name: "Graphpaper", url: "https://graphpaper-store.com/" },

  // --- ブーツ/シューズ ---
  { name: "Guidi", url: "https://guidi.it/" },
  { name: "Paraboot", url: "https://paraboot.shop/" },
  { name: "Danner", url: "https://jp.danner.com/" },
  { name: "Timberland", url: "https://www.timberland.co.jp/" },

  // --- スニーカー ---
  { name: "Nike", url: "https://www.nike.com/jp/launch" },
  { name: "New Balance", url: "https://shop.newbalance.jp/" },
  { name: "HOKA", url: "https://www.hoka.com/jp/" },
  { name: "Salomon", url: "https://salomon.jp/" },
  { name: "Converse", url: "https://converse.co.jp/" },
  { name: "Vans", url: "https://www.vans.co.jp/" },
  { name: "adidas", url: "https://www.adidas.jp/" },

  // --- フィギュア/ソフビ ---
  { name: "MEDICOM TOY", url: "https://www.medicomtoy.co.jp/" },
  { name: "GRAPE BRAIN", url: "https://www.instagram.com/grapebrain_rage/" },
  { name: "gyaromi", url: "https://www.instagram.com/gyaromi/" },
  { name: "INSTINCTOY", url: "https://www.instagram.com/instinctoy_official/" },
  { name: "emDASH", url: "https://www.instagram.com/emdash_toy/" },
  { name: "T9G", url: "https://www.instagram.com/xt9gx/" },
  /**
   * 創作ソフビ決起集会/大まん祭の公式Instagram。特定メーカーではなく、複数の作家・メーカーが
   * 出展するイベント告知アカウント。イベント自体の画像(ビジュアル・出展者一覧告知等)は運営元の
   * 著作物として扱えるが、出展メーカー個別の作品画像を使う場合は各メーカー自身の公式ソースを
   * 別途確認すること。
   */
  { name: "創作ソフビ決起集会(大まん祭)", url: "https://www.instagram.com/mdk.sofvi.fes/" },
]

/**
 * sofvi.tokyoは特定1ブランドではなく、MEDICOM TOY CORPORATIONが運営する複数メーカー横断の
 * ソフビ総合情報メディア（ブルマァク・マルサン・X-PLUS等、MEDICOM TOY以外のメーカーも扱う）。
 * DIRECT_BRAND_SOURCESの「ブランド自身が著作権者」という前提に厳密には当てはまらないため
 * あえて分離している。記事内でMEDICOM TOY自社製品を扱う分には運営元＝著作権者で問題ないが、
 * 他メーカーの製品画像を使う場合は撮影者クレジットの有無をページごとに確認し、不明なら
 * そのメーカー自身の公式ソースを探すこと。
 */
export const SOFVI_TOKYO_URL = "https://sofvi.tokyo/"

/**
 * セレクトショップは何百ブランドもの商品を自社で撮影するのが業界標準（DIRECT_BRAND_SOURCESの
 * 「掲載画像はブランド自身の著作物」という前提が成り立たない）。よってここに載っているサイトの
 * 商品写真・スタイリング画像は自己ホストしない。用途は次の2つに限定する：
 *   1. 入荷/取り扱い開始ニュースの情報源（本文はいつも通りAIが独自表現で書き直す）
 *   2. まだ知らないブランドを見つける発見ツール（見つけたら、そのブランド自身の公式サイト/
 *      Instagramを別途確認し、画像はそちら経由でDIRECT_BRAND_SOURCESの基準に沿って取得する）
 * 記事で画像を出す場合は officialLinks 等でこのショップへリンクするのは問題ないが、
 * カバー画像としてこのショップの写真を保存・自己ホストしないこと。
 */
export const SELECT_SHOP_SOURCES: BrandSource[] = [
  { name: "BEAMS", url: "https://www.beams.co.jp/" },
  { name: "UNITED ARROWS", url: "https://store.united-arrows.co.jp/" },
  { name: "TOMORROWLAND", url: "https://www.tomorrowland.co.jp/" },
  { name: "EDIFICE", url: "https://edifice.baycrews.co.jp/" },
  { name: "BAYCREW'S", url: "https://baycrews.jp/" },
  { name: "DAYTONA PARK", url: "https://www.daytona-park.com/?sex=men" },
  { name: "NUBIAN", url: "https://nubiantokyo.com/" },
  { name: "AMANOJAK", url: "https://www.amanojak.jp/" },
]

/**
 * 古着屋・中古ブランド品ショップは一点物の現物を自店で撮影するほかなく（＝そもそも
 * 「ブランド提供画像」が存在しえない）、SELECT_SHOP_SOURCES以上に画像はほぼ100%その
 * 店舗自身の著作物になる。よって用途は同じく入荷ニュースの情報源・発見用に限定し、
 * 商品写真は自己ホストしない。アパレルに限らず、中古ブランド品(バッグ等)を扱う
 * ショップも同じ理由でここに含める。
 */
export const VINTAGE_SHOP_SOURCES: BrandSource[] = [
  { name: "ROOM(三軒茶屋)", url: "https://www.instagram.com/room_sangenjaya/" },
  { name: "THREE", url: "https://www.instagram.com/three0511/" },
  { name: "tonari(祐天寺)", url: "https://www.instagram.com/tonari.yutenji/" },
  { name: "archeologie", url: "https://www.instagram.com/archeologie_vintage/" },
  {
    name: "planT vintage",
    url: "https://plantvintage.official.ec/",
    instagramUrl: "https://www.instagram.com/plant__vintage/",
  },
  { name: "Arms(祐天寺)", url: "https://www.instagram.com/armsclothingstore/" },
  { name: "on the hill(祐天寺)", url: "https://www.instagram.com/on_the_hill_yutenji/" },
  { name: "JUMPIN' JAP FLASH", url: "https://www.instagram.com/jumpinjapflash/" },
  // Only Used HERMES専門。楽天店舗(購入導線): https://www.rakuten.co.jp/pelemele-tokyo/
  { name: "PELE-MELE(中古エルメス専門)", url: "https://www.instagram.com/pelemele_tokyo/" },
  { name: "Strange(西麻布)", url: "https://www.instagram.com/strange_vintage_official/" },
]

/**
 * YouTubeチャンネルの動画・サムネイルはクリエイター自身の著作物。VINTAGE_SHOP_SOURCESと同じ理由で
 * 自己ホストしない — サムネイルの保存はもちろん、「権利表記(クレジット)さえ付ければ使ってよい」
 * という考え方も採用しない(表示許諾とクレジット表示は別問題。無許諾転載はクレジットの有無に
 * 関わらず無許諾転載のまま)。記事化する場合は動画の内容を独自の文章で紹介し、動画への
 * リンク(officialLinks)を張るに留める。カバー画像が必要な場合はライセンスフリーの
 * ストック写真等、別途権利がクリアな画像を使うこと。
 */
export const YOUTUBE_SOURCES: BrandSource[] = [
  { name: "石川俊介", url: "https://www.youtube.com/@Shunsuke_Ishikawa" },
  { name: "nakamu_nakamu", url: "https://www.youtube.com/@nakamu_nakamu" },
  { name: "Takahiro Kawashima", url: "https://www.youtube.com/@takahiro_kawashima" },
  { name: "YUYA OFUJI CHANNEL", url: "https://www.youtube.com/@YUYAOFUJICHANNEL" },
  { name: "Lou vintage mix", url: "https://www.youtube.com/@lou_vintage_mix_dayoff" },
]

/**
 * 2026-08-07時点でRSS疎通確認済み・robots.txtでクロール許可（/wp-admin/以外)を確認済みのソースのみを
 * 既定で有効化している。サイトリニューアル等でURLが変わることがあるため、追加・変更時は必ず
 * `curl -I <url>` で200が返ることと `curl <site>/robots.txt` を確認してから加えること。
 *
 * 【画像方針】記事本文はAIが事実ベースで書き直すため転載の問題は薄いが、カバー画像は
 * 「ブランド公式が提供した画像を各メディアが転載しているだけ」のサイトに限定している
 * （uptodate.tokyo/FULLRESSと同じ運用 = ブランド提供画像を保存して自己ホスト）。
 * 「自社で撮影・企画したオリジナル記事」中心のメディアは画像の出どころが明確に
 * そのメディア自身の著作物になるため、情報源として使わない：
 *   - HOUYHNHNM: 除外（自社撮影の編集記事が中心）
 *   - EYESCREAM: 除外（記事に"Photography_◯◯"のクレジットが入る自社発注撮影）
 * 一方、FASHIONSNAPは画像に"Image by: [ブランド名]"、HYPEBEAST JAPANは
 * 各画像に配信元ブランド名が明記されており、ブランド提供画像の転載だと確認できたため
 * 情報源として残している。ソースを追加する際は同じ基準（記事に撮影者クレジットが
 * 入っていないか）を必ず確認すること。
 *
 * 【著作権法32条の引用について】本文は上記の通りAIが独自表現へ全面的に書き直すため、
 * 他メディアの文章をそのまま引用する運用にはしていない（"要約・独自表現"の方が引用の
 * 要件（主従関係・必要最小限）を気にせず済み安全なため）。この方針はHOUYHNHNM/EYESCREAM
 * のような自社発注撮影の画像には及ばない — 引用は「出典を明示した上での必要最小限の
 * 転載」であり、記事のカバー画像・ヒーロー画像として丸ごと使うような用途（＝装飾目的）は
 * 主従関係の要件を満たさず対象外。画像は本ファイル上部のDIRECT_BRAND_SOURCES
 * （ブランド自身が著作権者）の範囲でのみ自己ホストする。
 */
export const SOURCES: SourceConfig[] = [
  {
    name: "HYPEBEAST JAPAN",
    rssUrl: "https://hypebeast.com/jp/feed",
    siteUrl: "https://hypebeast.com/jp",
  },
  {
    name: "FASHIONSNAP",
    rssUrl: "https://www.fashionsnap.com/rss.xml",
    siteUrl: "https://www.fashionsnap.com",
  },
  {
    name: "UPTODATE",
    rssUrl: "https://uptodate.tokyo/feed/",
    siteUrl: "https://uptodate.tokyo",
  },
  {
    name: "FULLRESS",
    rssUrl: "https://www.fullress.com/feed/",
    siteUrl: "https://www.fullress.com",
  },
]

/**
 * PR TIMESは全ジャンルのプレスリリースが流れる一次情報源。
 * ファッション/スニーカー関連キーワードを含むものだけを lib/collector.ts 側でフィルタする。
 */
export const PR_TIMES_RSS_URL = "https://prtimes.jp/index.rdf"

export const PR_TIMES_KEYWORDS = [
  "スニーカー",
  "ファッション",
  "アパレル",
  "ストリートファッション",
  "セレクトショップ",
  "アパレルブランド",
  "ファッションブランド",
  "スニーカーコラボ",
  "アパレルコラボ",
  "ファッションコラボ",
  "秋冬コレクション",
  "春夏コレクション",
  "Nike",
  "adidas",
  "New Balance",
  "Supreme",
  "ZOZO",
  "ユニクロ",
  "UNIQLO",
]
