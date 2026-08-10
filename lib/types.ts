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
}

export type DraftsData = {
  drafts: Draft[]
}
