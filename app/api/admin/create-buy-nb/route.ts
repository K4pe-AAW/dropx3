import { NextResponse } from "next/server"
import { mutateArticles, generateId, generateSlug } from "@/lib/storage"
import { buildMercariSearchLink } from "@/lib/affiliate"
import { Article } from "@/lib/types"

/**
 * 一時admin API。BUY型記事の横展開第2弾として、New Balance関連4記事(U993 BU/U991 AC2/
 * 204V Neo Flame/99Xシリーズ解説)をrelatedArticlesでまとめるハブ記事を新規作成する。
 * 既存のNike Air Max90 BUY記事(b0b2b7c1...)と同じ構成方針を踏襲。単一トランザクションで
 * 新記事の追加+既存4記事へのrelatedArticles追記を同時に行う。使用後に削除すること。
 */
const RELATED_IDS = [
  "043b2a3867219f2af886e3c3d87ae6c7", // U993 BU
  "4a33b7a42949f4ead1cd3d85ae3c5b83", // U991 AC2
  "c81e8598bb9aa34974648f083c99818e", // 204V Neo Flame
  "b74e36e4f095519e4565f496cf6f41ba", // 99Xシリーズ解説
]

export async function POST() {
  const title = "ニューバランス新作スニーカーまとめ｜U993・U991・204V最新モデル"
  const now = new Date().toISOString()
  const id = generateId(`buy-newbalance-${now}`)
  const slug = generateSlug(title, id)

  const newArticle: Article = {
    id,
    slug,
    title,
    excerpt:
      "New Balanceの人気ライン、990番台(U993/U991)と204シリーズの2026年8月新作をまとめて紹介。型番・カラー・価格帯・購入先を随時更新していく。",
    bodyParagraphs: [
      "2026年8月、ニューバランスから「990番台」「204」シリーズの新作が相次いで登場している。ここでは発売日が判明しているモデルをまとめ、型番・カラー・購入先を随時更新していく。",
      "Made in USAシリーズの「U993」からは新色「Burgundy」、Made in UKシリーズの「U991」からは新色「AC2(Wind Chime/Brilliant White)」がいずれも2026年8月14日に発売。国内正規販売の詳細は各記事の通り続報待ちだが、日本の公式オンラインストアでは同シリーズを993系42,900円・991系39,600円(ともに税込)から展開しており、入荷時はそちらもあわせて確認したい。",
      "2000年代のランニングスタイルをクライミングディテールで再解釈した「204V」からは新色「Neo Flame」「Fumble Blue」が8月8日に発売。ベースとなる204Vは日本の公式オンラインストアで15,950円(税込)から購入可能。",
      "価格・取扱店舗が「続報待ち」のモデルは、各モデルの詳細記事および公式サイトで最新情報を確認してほしい。990番台の歴代モデルを比較したい場合は、あわせてシリーズ解説記事も参考に。",
    ],
    coverImage: "/images/sneaker-nb-204v-neoflame-official.jpg",
    coverImageAlt: "New Balance 204V Neo Flame 公式画像",
    galleryImages: [],
    category: "sneaker",
    brands: ["New Balance"],
    tags: ["ニューバランス", "New Balance", "スニーカー", "U993", "U991", "204V"],
    publishedAt: now,
    featured: false,
    relatedArticles: [
      {
        title: "待望のニューバランス U993 BU “Burgundy” が登場！",
        slug: "待望のニューバランス-u993-bu-burgundy-が登場-043b2a38",
        note: "型番・発売日はこちら",
      },
      {
        title: "New Balanceが贈る新作U991 AC2、ついに登場！",
        slug: "new-balanceが贈る新作u991-ac2-ついに登場-4a33b7a4",
        note: "型番・発売日はこちら",
      },
      {
        title: "ニューバランス新作『204V Neo Flame』が登場！",
        slug: "ニューバランス新作-204v-neo-flame-が登場-c81e8598",
        note: "カラー展開はこちら",
      },
      {
        title: "ニューバランス99Xシリーズを徹底解剖！スニーカーの真髄とは",
        slug: "ニューバランス99xシリーズを徹底解剖-スニーカーの真髄とは-b74e36e4",
        note: "990番台の歴代モデルを解説",
      },
    ],
    affiliateLinks: [buildMercariSearchLink("New Balance")],
    officialLinks: [{ label: "New Balance公式サイトで見る", url: "https://shop.newbalance.jp/" }],
    sourceRefs: [],
  }

  const result = await mutateArticles((data) => {
    const next = { ...data, articles: [newArticle, ...data.articles] }
    next.articles = next.articles.map((a) => {
      if (!RELATED_IDS.includes(a.id)) return a
      const already = (a.relatedArticles ?? []).some((r) => r.slug === slug)
      if (already) return a
      return {
        ...a,
        relatedArticles: [...(a.relatedArticles ?? []), { title, slug, note: "まとめて見る" }],
        updatedAt: now,
      }
    })
    return next
  })

  return NextResponse.json({ ok: true, newArticleId: id, newArticleSlug: slug, totalArticles: result.articles.length })
}
