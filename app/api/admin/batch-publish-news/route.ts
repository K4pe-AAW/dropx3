import { NextResponse } from "next/server"
import { readArticles, writeArticles, readDrafts, writeDrafts, generateId, generateSlug } from "@/lib/storage"
import { sanitizeAffiliateLinks, isSafeExternalUrl } from "@/lib/affiliate"
import type { Article, AffiliateLink } from "@/lib/types"

const MERCARI_SNEAKER_LINK: AffiliateLink = {
  label: "メルカリで探す",
  retailer: "メルカリ",
  url: "https://px.a8.net/svt/ejp?a8mat=4BA1PB+31JS36+5LNQ+BW8O2&a8ejpredirect=https%3A%2F%2Fjp.mercari.com%2Fsearch%3Fkeyword%3D%E3%82%B9%E3%83%8B%E3%83%BC%E3%82%AB%E3%83%BC",
}

type Input = {
  title: string
  excerpt: string
  bodyParagraphs: string[]
  coverImage: string
  coverImageAlt: string
  brands: string[]
  tags: string[]
  officialLinks: { label: string; url: string }[]
  sourceRefs: { name: string; url: string }[]
}

const ARTICLES: Input[] = [
  {
    title: "NIKE AIR JORDAN 3 RETRO「Sport Renaissance」が2026年8月15日発売",
    excerpt: "青とピンクの配色が目を引くAJ3の新色「Sport Renaissance」。2026年8月15日14時に発売予定。",
    bodyParagraphs: [
      "スニーカー愛好者の心を掴んで離さないNIKEのAir Jordanシリーズから、新たな話題作「Sport Renaissance」が登場。2026年8月15日14時(現地時間)の発売が発表された。Air Jordan 3のクラシックなシルエットを踏襲しつつ、現代的なデザインとカラーリングが新鮮な印象を与える一足だ。",
      "左右非対称の配色が最大の特徴。片足はオブシディアンのレザーアッパーにライトブルーとホワイトの差し色、もう片足はホットピンクとレッドのアクセントが入る。リファインされたラッシュタンとメッシュのアクセント、伝統的なエレファントプリントに代わるタンブルレザーオーバーレイなど、ディテールも作り込まれている。",
      "Air Jordan 3の過去の名作を思い起こさせる要素を残しつつ、単なる復刻に留まらないスタイルへと昇華されている点も見どころ。デニムとの相性はもちろん、スラックスやミニマルなスタイルとも組み合わせやすい。",
      "【商品情報】\nモデル: Air Jordan 3 Retro「Sport Renaissance」(Obsidian and Track Red)\n型番: CK9246-400\n発売日: 2026年8月15日14:00〜(Nike SNKRS)\n価格: 海外(US)価格で$205.00。国内価格・取扱いは公式サイトで要確認\n販売情報は判明次第更新します。",
    ],
    coverImage: "/images/sneaker-nike-aj3-sport-renaissance-official.jpg",
    coverImageAlt: "Air Jordan 3 Retro Sport Renaissance CK9246-400",
    brands: ["NIKE", "Air Jordan"],
    tags: ["Air Jordan", "スニーカー", "NIKE"],
    officialLinks: [
      { label: "Nike SNKRS 公式ページ", url: "https://www.nike.com/launch/t/womens-air-jordan-3-sport-renaissance-obsidian-and-track-red" },
    ],
    sourceRefs: [{ name: "FULLRESS", url: "https://www.fullress.com/nike-air-jordan-3-retro-sports-renaissance-ck9246-400/" }],
  },
  {
    title: "NIKE AIR MAX 90 SP「Shadow Brown」が2026年8月12日発売",
    excerpt: "落ち着いたブラウンで仕上げたエアマックス90の新色「Shadow Brown」。2026年8月12日14時発売。",
    bodyParagraphs: [
      "ストリートファッションの定番、NIKEのエアマックス90に新たな仲間が加わる。その名も「Shadow Brown」。2026年8月12日14時(現地時間)発売予定だ。シックなブラウンを基調にしたデザインで、どんなスタイルにも合わせやすい仕上がりが魅力となっている。",
      "アッパーには上質なレザーを採用し、見た目だけでなく質感にもこだわりが感じられる一足。エアマックス90のアイコニックなワッフルソールと視認可能なAirクッショニングはそのままに、落ち着いた色合いが絶妙にマッチしている。",
      "デニムやチノパンとの相性はもちろん、秋冬のコーディネートでは深みのあるブラウンがアクセントとなりそうだ。エアマックス90シリーズの中でも新鮮な印象を与えるカラーウェイと言える。",
      "【商品情報】\nモデル: Nike Air Max 90 SP「Shadow Brown」\n型番: IR1953-200\n発売日: 2026年8月12日14:00〜(Nike SNKRS)\n価格: 海外(US)価格で$155.00。国内価格・取扱いは公式サイトで要確認\n販売情報は判明次第更新します。",
    ],
    coverImage: "/images/sneaker-nike-am90-shadow-brown-official.jpg",
    coverImageAlt: "Nike Air Max 90 SP Shadow Brown IR1953-200",
    brands: ["NIKE"],
    tags: ["エアマックス", "スニーカー", "NIKE"],
    officialLinks: [{ label: "Nike SNKRS 公式ページ", url: "https://www.nike.com/launch/t/air-max-90-shadow-brown" }],
    sourceRefs: [{ name: "FULLRESS", url: "https://www.fullress.com/nike-air-max-90-sp-shadow-brown-ir1953-200/" }],
  },
  {
    title: "NIKE AIR MAX 90「Black/Tough Red」が本日発売、価格は16,500円",
    excerpt: "ブラックにタフレッドのスウォッシュが映えるエアマックス90の新色が本日発売。Nike公式で16,500円(税込)。",
    bodyParagraphs: [
      "ナイキの名作スニーカー、AIR MAX 90に新色「Black/Tough Red」が登場。2026年8月10日、Nike公式オンラインストアで発売が開始された。ブラックのアッパーにタフレッドのスウォッシュとトリムが映える、シンプルながら存在感のある一足だ。",
      "AIR MAX 90は、そのユニークなシルエットとクッション性で長年多くのファンを魅了してきたモデル。今作もその伝統を受け継ぎつつ、差し色のタフレッドが他のアイテムとも組み合わせやすいアクセントになっている。原産国はインドネシア。",
      "デニムやチノパンでのカジュアルな着こなしから、秋冬はアウターとのコンビネーションまで幅広く活躍しそうな一足。すでに全サイズNike公式サイトで購入可能となっている。",
      "【商品情報】\nモデル: Nike Air Max 90「Black/Tough Red」\n型番: IM9616-001\n発売日: 2026年8月10日(発売中)\n価格: 16,500円(税込) ※Nike公式サイト調べ\n購入: Nike公式サイトで即購入可能",
    ],
    coverImage: "/images/sneaker-nike-am90-tough-red-official.jpg",
    coverImageAlt: "Nike Air Max 90 Black/Tough Red IM9616-001",
    brands: ["NIKE"],
    tags: ["エアマックス", "スニーカー", "NIKE"],
    officialLinks: [
      { label: "Nike公式サイトで購入する", url: "https://www.nike.com/jp/t/%E3%83%8A%E3%82%A4%E3%82%AD-%E3%82%A8%E3%82%A2-%E3%83%9E%E3%83%83%E3%82%AF%E3%82%B9-90-%E3%83%A1%E3%83%B3%E3%82%BA%E3%82%B7%E3%83%A5%E3%83%BC%E3%82%BA-ylcXvj7v/IM9616-001" },
    ],
    sourceRefs: [{ name: "FULLRESS", url: "https://www.fullress.com/nike-air-max-90-black-tough-red-im9616-001/" }],
  },
]

export async function POST() {
  const data = await readArticles()
  const publishedSlugs: string[] = []

  for (const input of ARTICLES) {
    const dup = data.articles.find((a) => a.sourceRefs.some((r) => input.sourceRefs.some((s) => s.url === r.url)))
    if (dup) continue

    const officialLinks = input.officialLinks.filter((l) => isSafeExternalUrl(l.url))
    const affiliateLinks = sanitizeAffiliateLinks([MERCARI_SNEAKER_LINK])
    const newId = generateId(`news-${input.sourceRefs[0]?.url}-${Date.now()}-${publishedSlugs.length}`)

    const article: Article = {
      id: newId,
      slug: generateSlug(input.title, newId),
      title: input.title,
      excerpt: input.excerpt,
      bodyParagraphs: input.bodyParagraphs,
      coverImage: input.coverImage,
      coverImageAlt: input.coverImageAlt,
      galleryImages: [],
      category: "sneaker",
      brands: input.brands,
      tags: input.tags,
      publishedAt: new Date().toISOString(),
      featured: false,
      affiliateLinks,
      officialLinks,
      sourceRefs: input.sourceRefs,
    }
    data.articles.unshift(article)
    publishedSlugs.push(article.slug)
  }

  data.lastUpdated = new Date().toISOString()
  await writeArticles(data)

  // 元の下書きは公開済みとして一覧から取り除く(sourceRefsのURLで突合)
  const publishedSourceUrls = new Set(ARTICLES.flatMap((a) => a.sourceRefs.map((r) => r.url)))
  const draftsData = await readDrafts()
  draftsData.drafts = draftsData.drafts.filter((d) => !d.sourceRefs.some((r) => publishedSourceUrls.has(r.url)))
  await writeDrafts(draftsData)

  return NextResponse.json({ ok: true, publishedSlugs })
}
