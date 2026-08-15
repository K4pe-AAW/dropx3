import { NextResponse } from "next/server"
import { readArticles, writeArticles, generateId, generateSlug } from "@/lib/storage"
import type { Article, RelatedArticleLink } from "@/lib/types"

/**
 * 一時admin API。PRODUCT型ハブページ第1弾(Nike Air Max 90)を作成し、既存2記事+BUYまとめ記事へ
 * 相互リンクを追加する。単一トランザクション(readArticles 1回→メモリ上で全変更→writeArticles 1回)。
 * 使用後は削除する(project_dropwireの既存運用ルール通り)。
 */
export async function POST() {
  const data = await readArticles()

  const blackToughRed = data.articles.find((a) => a.slug.startsWith("nike-air-max-90-black-tough-red"))
  const shadowBrown = data.articles.find((a) => a.slug.startsWith("nike-air-max-90-sp-shadow-brown"))
  const roundup = data.articles.find((a) => a.slug.startsWith("8月12日発売-nike-air-max最新作まとめ"))

  if (!blackToughRed || !shadowBrown || !roundup) {
    return NextResponse.json(
      { error: "対象記事が見つかりません", found: { blackToughRed: !!blackToughRed, shadowBrown: !!shadowBrown, roundup: !!roundup } },
      { status: 404 }
    )
  }

  const title = "NIKE AIR MAX 90 2026年注目カラー一覧｜発売日・価格・購入先まとめ"
  const id = generateId(`am90-hub-${Date.now()}`)
  const slug = generateSlug(title, id)

  const hub: Article = {
    id,
    slug,
    title,
    excerpt:
      "Nikeのアイコン、AIR MAX 90の魅力と2026年の注目カラー展開を1ページにまとめて紹介。型番・価格・発売日・購入先を随時更新していく。",
    bodyParagraphs: [
      "NIKEを代表するアイコンモデル、AIR MAX 90。1990年の登場以来、視認可能なAirユニットとウェーブ状のサイドパネルを特徴に、世代を超えて支持され続けている。ここでは2026年に登場した注目カラーを随時まとめ、型番・価格・発売日・購入先を一覧できるページとして更新していく。",
      "現時点でチェックしておきたいのは以下の2色。どちらもNike公式サイトで購入可能で、売り切れ時はメルカリ等の中古・マーケットプレイスもあわせてチェックしたい。",
    ],
    coverImage: "/images/sneaker-nike-am90-tough-red-official.jpg",
    coverImageAlt: "Nike Air Max 90 Black/Tough Red 公式画像",
    galleryImages: [],
    category: "sneaker",
    brands: ["Nike"],
    tags: ["エアマックス", "Air Max 90", "スニーカー", "NIKE"],
    publishedAt: new Date().toISOString(),
    featured: false,
    colorways: [
      {
        colorName: "Black/Tough Red",
        image: "/images/sneaker-nike-am90-tough-red-official.jpg",
        styleCode: "IM9616-001",
        price: "16,500円(税込)",
        releaseDate: "2026年8月10日(発売中)",
        retailers: ["Nike公式サイト"],
      },
      {
        colorName: "Shadow Brown",
        image: "/images/sneaker-nike-am90-shadow-brown-official.jpg",
        styleCode: "IR1953-200",
        price: "US$155.00(国内価格は公式サイトで要確認)",
        releaseDate: "2026年8月12日14:00〜(Nike SNKRS)",
        retailers: ["Nike SNKRS"],
      },
    ],
    relatedArticles: [
      { title: blackToughRed.title, slug: blackToughRed.slug, note: "詳細な購入先・スペックはこちら" },
      { title: shadowBrown.title, slug: shadowBrown.slug, note: "詳細な購入先・スペックはこちら" },
      { title: roundup.title, slug: roundup.slug, note: "Air Max 95の新作情報もあわせてチェック" },
    ],
    affiliateLinks: [
      {
        label: "メルカリで探す",
        retailer: "メルカリ",
        url: "https://px.a8.net/svt/ejp?a8mat=4BA1PB+31JS36+5LNQ+BW8O2&a8ejpredirect=https%3A%2F%2Fjp.mercari.com%2Fsearch%3Fkeyword%3DNike%2520Air%2520Max%252090",
      },
    ],
    officialLinks: [
      {
        label: "Black/Tough Redをnike.comで見る",
        url: "https://www.nike.com/jp/t/%E3%83%8A%E3%82%A4%E3%82%AD-%E3%82%A8%E3%82%A2-%E3%83%9E%E3%83%83%E3%82%AF%E3%82%B9-90-%E3%83%A1%E3%83%B3%E3%82%BA%E3%82%B7%E3%83%A5%E3%83%BC%E3%82%BA-ylcXvj7v/IM9616-001",
      },
      {
        label: "Shadow BrownをNike SNKRSで見る",
        url: "https://www.nike.com/launch/t/air-max-90-shadow-brown",
      },
    ],
    sourceRefs: [
      { name: "FULLRESS (Black/Tough Red)", url: "https://www.fullress.com/nike-air-max-90-black-tough-red-im9616-001/" },
      { name: "FULLRESS (Shadow Brown)", url: "https://www.fullress.com/nike-air-max-90-sp-shadow-brown-ir1953-200/" },
    ],
  }

  const backlink: RelatedArticleLink = { title, slug, note: "全カラー・発売日・購入先の一覧はこちら" }
  for (const target of [blackToughRed, shadowBrown, roundup]) {
    target.relatedArticles = [...(target.relatedArticles ?? []), backlink]
    target.updatedAt = new Date().toISOString()
  }

  data.articles.unshift(hub)
  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)

  return NextResponse.json({ ok: true, slug, url: `https://dropx3.com/articles/${slug}` })
}
