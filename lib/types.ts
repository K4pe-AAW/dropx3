export type Category =
  | "tops"
  | "pants"
  | "jacket"
  | "apparel"
  | "boots"
  | "sneaker"
  | "accessory"
  | "figure"
  | "vintage"
  | "news"
  | "brand"
  | "youtube"

export type AffiliateLink = {
  label: string // 例: "楽天市場で探す"
  retailer: string // 例: "楽天市場", "Amazon", "A8.net"
  url: string
  price?: string // 表示用の価格文字列。例: "¥16,500(税込)"
}

export type SourceRef = {
  name: string
  url: string
}

export type OfficialLink = {
  label: string // 例: "AURALEE公式サイトで見る"
  url: string
}

/**
 * 本文(bodyParagraphs)はXSS対策でプレーンテキストのためリンクを埋め込めない。
 * BUY/GUIDE型記事のように既存記事へ内部リンクしたい場合、この構造化フィールドで
 * 「この記事で紹介した商品・記事」ブロックとして表示する(ColorwaySection等と同じ設計方針)。
 */
export type RelatedArticleLink = {
  title: string
  slug: string
  note?: string // 例: "定価・詳細な発売情報はこちら"
}

export type GalleryImage = {
  url: string
  alt: string
  /** 撮影者/提供元クレジット。表示用の文字列をそのまま持つ(例: "Photo: AURALEE" "画像提供: 〇〇") */
  credit?: string
}

/**
 * カラー展開ごとの商品スペック。UPTODATE等の競合メディアが商品カードで
 * 表示している型番・価格・サイズ・発売日をカラー単位で構造化して持つ。
 * 全て任意項目——情報源に無い値は空にする(捏造禁止)。
 */
export type ColorwayInfo = {
  colorName: string // 例: "Black/Black"
  image?: string
  styleCode?: string // 例: "1203B064.001"
  price?: string // 表示用の価格文字列。例: "38,500円（税込）"
  size?: string // 例: "JP24.0 – JP29"
  releaseDate?: string // 表示用の文字列。例: "2026年8月7日" "9月上旬" 等、確定日でなくてもよい
  retailers?: string[] // 例: ["HOKA公式サイト", "mita sneakers", "UNITED ARROWS & SONS"]
}

/**
 * FULLRESS等の競合メディアが「取り扱い店舗」ブロックで見せている、店舗ごとの販売方法(抽選/通常)と
 * 日程の一覧。ColorwayInfo.retailersが単純な店名配列なのに対し、こちらは店舗を公式/二次流通で
 * 分け、店舗ごとに抽選か通常販売かと日程まで持たせる。全項目情報源に無ければ空にする(捏造禁止)。
 */
export type PurchaseChannelInfo = {
  retailerName: string // 例: "mita sneakers"
  channelType: "official" | "secondary" // official=ブランド公式/正規販売店、secondary=セレクト店・二次流通
  saleMethod: "regular" | "lottery" | "unknown" // regular=通常販売、lottery=抽選、unknown=情報源に記載なし
  date?: string // 発売日 or 応募期間等の表示用文字列。例: "2026年9月1日〜9月7日 応募"
  url?: string
}

/**
 * ブランド公式サイトの他の実売商品(写真+商品名+価格+リンク)。UPTODATE等の競合メディアが記事内に
 * 置いている「ブランド公式のおすすめ商品」ウィジェットに相当。ColorwayInfoが同一商品の色違いを
 * 表すのに対し、こちらは同ブランドの別商品を並べる。情報源(ブランド公式サイト)に無い値は
 * 空にする(捏造禁止、他のstructured fieldと同じ方針)。
 */
export type OfficialProductLink = {
  name: string // 例: "メンズ Clifton PRO クリフトン プロ"
  image: string
  price?: string // 表示用の価格文字列。例: "¥22,000"
  url: string // ブランド公式サイトの商品ページ
}

export type Article = {
  id: string
  slug: string
  title: string
  excerpt: string
  /** 段落単位のプレーンテキスト。React側でエスケープ表示するのでHTML注入の心配がない */
  bodyParagraphs: string[]
  coverImage: string
  coverImageAlt: string
  /** カバー画像の撮影者/提供元クレジット(任意)。GalleryImage.creditと同じ用途 */
  coverImageCredit?: string
  /** 記事詳細ページでcoverImageの後に並べる追加カット。一覧・カードには出さない */
  galleryImages: GalleryImage[]
  /** YouTube公式の埋め込みプレイヤー用video ID。サムネイル画像の自己ホストは行わず、埋め込みで表示する */
  youtubeVideoId?: string
  /**
   * 著作権法32条の引用。原文ママの抜粋を「引用」ラベル付きの独立したブロックとして表示し、
   * 本文(独自の説明・論評)とは明瞭に区別する。sourceLabelには出典を明記する。
   */
  quote?: { text: string; sourceLabel: string }
  category: Category
  brands: string[]
  tags: string[]
  publishedAt: string // ISO 8601
  updatedAt?: string
  featured: boolean
  /** カラー展開ごとの型番・価格・サイズ・発売日。複数色を扱う記事のみ設定(任意) */
  colorways?: ColorwayInfo[]
  /** 店舗ごとの抽選/通常販売と日程一覧(FULLRESS形式)。抽選が絡む発売記事のみ設定(任意) */
  purchaseChannels?: PurchaseChannelInfo[]
  /** 内部リンクしたい既存記事(BUY/GUIDE型記事向け)。本文には埋め込めないため構造化フィールドで持つ */
  relatedArticles?: RelatedArticleLink[]
  /** 同ブランドの他の実売商品(写真+商品名+価格+公式リンク)。記事本文の商品とは別物のクロスセル枠 */
  officialProducts?: OfficialProductLink[]
  affiliateLinks: AffiliateLink[]
  /** ブランド/店舗の公式サイトへの直リンク。紹介料が発生しないため"PR"表記は付けない */
  officialLinks: OfficialLink[]
  sourceRefs: SourceRef[]
}

export type ArticlesData = {
  articles: Article[]
  lastUpdated: string
}

/**
 * 予約公開待ちの記事。中身はArticleとほぼ同じ(公開時にそのままarticles.jsonへ移すだけで済むように)
 * だが、公開日時が未来のscheduledPublishAtに置き換わっている。scheduledPublishAtを過ぎたら
 * cron(app/api/cron/publish-scheduled)がpublishedAt=scheduledPublishAtとしてarticles.jsonへ
 * 昇格させる。それまでの間、articles.jsonには一切存在しないため公開系の読み取り経路
 * (getAllArticles等)を一切変更せずに完全非公開を実現できる。
 */
export type ScheduledArticle = Omit<Article, "publishedAt"> & {
  scheduledPublishAt: string // ISO 8601
}

export type ScheduledArticlesData = {
  scheduled: ScheduledArticle[]
}

// --- 収集パイプライン (collector -> AI下書き -> レビュー -> 公開) ---

export type RawItem = {
  id: string
  sourceName: string
  sourceUrl: string
  title: string
  snippet?: string
  publishedAt: string
  fetchedAt: string
  /** 取得済みページのog:image等から機械抽出した画像候補(あれば)。draftFromRawItemの初期カバー画像に使う */
  imageCandidates?: string[]
  /** 元ページに実在する販売・抽選関連リンク。AIがURLを創作しないための許可リストとしても使う */
  commerceLinkCandidates?: { label: string; url: string }[]
}

export type DraftStatus = "pending" | "approved" | "rejected"

export type Draft = {
  id: string
  status: DraftStatus
  title: string
  excerpt: string
  bodyParagraphs: string[]
  category: Category
  brands: string[]
  tags: string[]
  /**
   * AIには実在しないアフィリエイトURLを生成させない。
   * 代わりに検索キーワードだけ提案させ、実リンクは公開時に人間がA8.net/
   * バリューコマースの管理画面から取得して貼る（lib/storage.ts の publishDraft 参照）。
   */
  suggestedAffiliateSearch: string[]
  sourceRefs: SourceRef[]
  createdAt: string
  /** 元ネタ(出典記事/動画)が実際に投稿・公開された日時。管理画面の新しい順/古い順ソートに使う。
   * createdAt(このDropDropDropが収集した時刻)とは別物 — 収集が遅れれば両者はずれる */
  sourcePublishedAt?: string
  /**
   * SOURCE WATCH(lib/source-watch/)がCONFIRMED商品から生成したDraftにのみ設定される。
   * PublishForm側でこれらを初期値として使うと、画像/リンク/カラー展開を毎回ゼロから
   * 手入力しなくて済む(ただしすべて人間が公開前に確認・編集できる=自動公開ではない)。
   */
  sourceWatchProductId?: string
  suggestedCoverImage?: string
  suggestedGalleryImages?: GalleryImage[]
  /** RSS収集したYouTube動画のsourceUrl(watch?v=…)から自動抽出したvideoId。category="youtube"の場合のみ */
  suggestedYoutubeVideoId?: string
  suggestedColorways?: ColorwayInfo[]
  suggestedOfficialLinks?: OfficialLink[]
  suggestedPurchaseChannels?: PurchaseChannelInfo[]
}

export type DraftsData = {
  drafts: Draft[]
  /** 管理画面で削除済み。自動収集では再生成せず、URL直接入力時だけ解除する */
  dismissedSourceUrls?: string[]
}

// --- クローリング対象(RSS収集パイプラインが巡回するYouTubeチャンネル・ブランド公式サイト) ---
// lib/sources.tsのハードコード配列(YOUTUBE_SOURCES/DIRECT_BRAND_SOURCES)をBlobへ移行したもの。
// 管理画面(/admin/crawl-sources)から追加・削除できる。

export type YoutubeCrawlSource = {
  id: string
  name: string
  channelId: string
  siteUrl: string
  createdAt: string
}

export type BrandCrawlSource = {
  id: string
  name: string
  url: string
  /** Instagram等、公式サイト以外に画像取得を確認済みの補助ソースがあれば */
  instagramUrl?: string
  createdAt: string
}

export type CrawlSourcesData = {
  youtube: YoutubeCrawlSource[]
  brands: BrandCrawlSource[]
}
