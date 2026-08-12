import { NextResponse } from "next/server"
import { publishArticle, generateId, generateSlug } from "@/lib/storage"
import type { Article } from "@/lib/types"

/**
 * 一時API。BUY型記事の試験第1弾を直接公開する(1回使用後に削除予定)。
 * 3つの既存Air Max記事から実際に確認済みの型番・価格・発売日のみを使用(捏造なし)。
 */
export async function POST() {
  const title = "【8月12日発売】Nike Air Max最新作まとめ｜「Shadow Brown」ほか今買える3足"
  const id = generateId(`buy-nike-air-max-roundup-${title}`)

  const article: Article = {
    id,
    slug: generateSlug(title, id),
    title,
    excerpt: "本日発売のNIKE AIR MAX 90 SP「Shadow Brown」を中心に、今チェックすべきAir Max新作・話題作を3つまとめて紹介。",
    bodyParagraphs: [
      "Nike Air Maxシリーズで今、続けざまに新作が登場している。2026年8月12日にはAIR MAX 90 SP「Shadow Brown」が発売されたばかりで、既に発売中の「Black/Tough Red」、そして今秋登場予定のデニムモデル「Air Max 95 Ashen Slate」まで、狙い目のモデルが揃ってきた。ここでは3足を購入検討の参考としてまとめて紹介する。",
      "まず本日発売なのがAIR MAX 90 SP「Shadow Brown」(型番: IR1953-200)。上質なレザーアッパーにシックなブラウンを纏わせた一足で、2026年8月12日14:00よりNike SNKRSで発売開始。海外(US)価格は$155.00で、国内価格・取扱いは公式サイトで要確認となっている。詳細・購入先は下記の関連記事へ。",
      "既に発売中で購入しやすいのがAIR MAX 90「Black/Tough Red」(型番: IM9616-001)。ブラックのアッパーにタフレッドのスウォッシュが映えるシンプルな配色で、価格は16,500円(税込)。Nike公式サイトで全サイズ購入可能だ。",
      "少し先を見据えるなら、2026年秋頃発売予定のAIR MAX 95「Ashen Slate」も要チェック。3種類のデニムをグラデーション状に配置したウェーブ状のサイドパネルが特徴で、価格は200ドル。詳しいデザインの見どころは下記の記事で紹介している。",
      "気になる一足がサイズ切れ・売り切れの場合は、中古・マーケットプレイスもあわせてチェックしてみてほしい。",
    ],
    coverImage: "/images/sneaker-nike-logo-lime.jpg",
    coverImageAlt: "Nike Air Max",
    galleryImages: [],
    category: "sneaker",
    brands: ["Nike"],
    tags: ["エアマックス", "Air Max", "まとめ"],
    publishedAt: new Date().toISOString(),
    featured: false,
    relatedArticles: [
      {
        title: "NIKE AIR MAX 90 SP「Shadow Brown」が2026年8月12日発売",
        slug: "nike-air-max-90-sp-shadow-brown-が2026年8月12日発売-c023763a",
        note: "本日発売。型番・購入先はこちら",
      },
      {
        title: "NIKE AIR MAX 90「Black/Tough Red」が本日発売、価格は16,500円",
        slug: "nike-air-max-90-black-tough-red-が本日発売-価格は16-500円-4784b942",
        note: "発売中、¥16,500(税込)。購入先はこちら",
      },
      {
        title: "デニムの魅力を引き立てた新作Air Max 95登場",
        slug: "デニムの魅力を引き立てた新作air-max-95登場-62e34711",
        note: "2026年秋発売予定。デザイン詳細はこちら",
      },
    ],
    affiliateLinks: [
      {
        label: "メルカリで探す",
        retailer: "メルカリ",
        url: "https://px.a8.net/svt/ejp?a8mat=4BA1PB+31JS36+5LNQ+BW8O2&a8ejpredirect=" + encodeURIComponent("https://jp.mercari.com/search?keyword=" + encodeURIComponent("Nike Air Max 90")),
      },
    ],
    officialLinks: [{ label: "Nike公式サイトで見る", url: "https://www.nike.com/jp/" }],
    sourceRefs: [],
  }

  await publishArticle(article)
  return NextResponse.json({ ok: true, id: article.id, slug: article.slug })
}
