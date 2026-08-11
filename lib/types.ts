export type Category = "tops" | "pants" | "jacket" | "boots" | "sneaker" | "accessory" | "figure" | "vintage" | "youtube"

export type AffiliateLink = {
  label: string // 例: "ZOZOTOWNで見る"
  retailer: string // 例: "ZOZOTOWN", "楽天市場", "A8.net"
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

export type GalleryImage = {
  url: string
  alt: string
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

export type Article = {
  id: string
  slug: string
  title: string
  excerpt: string
  /** 段落単位のプレーンテキスト。React側でエスケープ表示するのでHTML注入の心配がない */
  bodyParagraphs: string[]
  coverImage: string
  coverImageAlt: string
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
  affiliateLinks: AffiliateLink[]
  /** ブランド/店舗の公式サイトへの直リンク。紹介料が発生しないため"PR"表記は付けない */
  officialLinks: OfficialLink[]
  sourceRefs: SourceRef[]
}

export type ArticlesData = {
  articles: Article[]
  lastUpdated: string
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
  /**
   * SOURCE WATCH(lib/source-watch/)がCONFIRMED商品から生成したDraftにのみ設定される。
   * PublishForm側でこれらを初期値として使うと、画像/リンク/カラー展開を毎回ゼロから
   * 手入力しなくて済む(ただしすべて人間が公開前に確認・編集できる=自動公開ではない)。
   */
  sourceWatchProductId?: string
  suggestedCoverImage?: string
  suggestedGalleryImages?: GalleryImage[]
  suggestedColorways?: ColorwayInfo[]
  suggestedOfficialLinks?: OfficialLink[]
  suggestedPurchaseChannels?: PurchaseChannelInfo[]
}

export type DraftsData = {
  drafts: Draft[]
}
