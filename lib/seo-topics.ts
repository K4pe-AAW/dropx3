import type { Article, Category, Draft } from "./types"

export type SeoTopic = {
  slug: string
  label: string
  title: string
  description: string
  intro: string
}

export const SEO_TOPICS: readonly SeoTopic[] = [
  {
    slug: "fashion",
    label: "ファッション",
    title: "ファッション最新情報・発売ニュース",
    description: "メンズ・ユニセックスを中心に、ファッションの新作、コラボ、発売日、価格、販売情報をまとめます。",
    intro: "ストリートからデザイナーズ、古着まで、いま押さえておきたいファッション情報を編集部が整理。価格や発売日、公式販売先も確認できます。",
  },
  {
    slug: "late-20s-style",
    label: "20代後半おしゃれ",
    title: "20代後半のおしゃれ・ファッション",
    description: "20代後半の仕事と休日に取り入れやすい、今っぽさと長く使える定番を両立したファッション情報をまとめます。",
    intro: "トレンドだけに寄りすぎず、仕事にも休日にも使いやすい服、スニーカー、小物を紹介。20代後半から先も着続けやすい一着を探せます。",
  },
  {
    slug: "30s-style",
    label: "30代おしゃれ",
    title: "30代のおしゃれ・大人ファッション",
    description: "30代の仕事着や休日コーデに取り入れやすい、きれいめファッション、スニーカー、長く使える定番品の情報をまとめます。",
    intro: "仕事と休日のどちらにもなじむ、きれいめな服や上質な定番を中心に紹介。30代の普段着へ取り入れやすい新作、スニーカー、小物を探せます。",
  },
  {
    slug: "40s-style",
    label: "40代おしゃれ",
    title: "40代のおしゃれ・大人ファッション",
    description: "40代の着こなしに取り入れやすい、大人向けファッション、スニーカー、定番品の情報をまとめます。",
    intro: "年齢だけで服を限定せず、素材、シルエット、合わせやすさを重視。40代の普段着へ自然に取り入れやすい新作や定番を集めています。",
  },
  {
    slug: "50s-style",
    label: "50代おしゃれ",
    title: "50代のおしゃれ・大人ファッション",
    description: "50代の着こなしに取り入れやすい、上質素材、落ち着いた色、快適さを備えたファッション情報をまとめます。",
    intro: "若作りや年齢による制限ではなく、品のよさ、シルエット、着心地を基準に選定。50代の日常へ自然になじむ新作や定番を探せます。",
  },
  {
    slug: "60s-style",
    label: "60代おしゃれ",
    title: "60代のおしゃれ・快適な大人ファッション",
    description: "60代の毎日に取り入れやすい、軽さ、歩きやすさ、着心地とデザインを両立したファッション情報をまとめます。",
    intro: "年齢だけで選択肢を狭めず、軽量性、着脱のしやすさ、歩きやすさと見た目のよさを重視。60代も楽しめる服、靴、小物を紹介します。",
  },
  {
    slug: "mens-fashion",
    label: "メンズファッション",
    title: "メンズファッション最新情報",
    description: "メンズファッションの新作、コラボ、発売日、価格、販売情報を紹介します。",
    intro: "メンズとユニセックスの新作を中心に、スニーカー、アウター、パンツ、小物まで横断して紹介します。",
  },
] as const

const FASHION_CATEGORIES = new Set<Category>(["tops", "pants", "jacket", "apparel", "boots", "sneaker", "accessory", "vintage", "brand"])
const MENS_PATTERN = /(?:メンズ|men(?:'s|s)?|紳士|男性向け|ユニセックス)/i
const WOMENS_ONLY_PATTERN = /(?:ウィメンズ|レディース|women(?:'s|s)?|女性向け)/i
const LATE_TWENTIES_PATTERN = /(?:20代後半|25歳(?:以上)?|26歳|27歳|28歳|29歳|around\s*30|アラサー世代)/i
const THIRTIES_PATTERN = /(?:30代|30歳代|仕事(?:着|服|コーデ)|通勤(?:着|服|コーデ)|オンオフ兼用|オンにもオフにも|きれいめ(?:カジュアル|コーデ|スタイル)|休日(?:服|コーデ)|都会的(?:な|に)?(?:着こなし|スタイル)|上質な普段着)/i
const FORTIES_PATTERN = /(?:40代|アラフォー|ミドル世代|大人(?:の|向け)?(?:服|ファッション|コーデ|スタイル|着こなし)|上品(?:な|に)?(?:着こなし|スタイル)|定番として|長く使える|タイムレス|クラシック)/i
const FIFTIES_PATTERN = /(?:50代|50歳代|アラフィフ|品格(?:のある|を感じる)?(?:服|ファッション|コーデ|スタイル|着こなし)|落ち着いた(?:色|配色|装い)|上質素材|体型を拾いにくい|大人カジュアル)/i
const SIXTIES_PATTERN = /(?:60代|60歳代|アラカン|還暦|シニアファッション|軽量で歩きやすい|着脱しやすい|疲れにくい(?:靴|スニーカー)|快適な着心地)/i

type TopicCandidate = Pick<Article, "title" | "excerpt" | "bodyParagraphs" | "category" | "tags"> | Pick<Draft, "title" | "excerpt" | "bodyParagraphs" | "category" | "tags">

function searchableText(item: TopicCandidate): string {
  return [item.title, item.excerpt, ...item.bodyParagraphs, ...item.tags].join(" ")
}

export function seoTopicBySlug(slug: string): SeoTopic | undefined {
  return SEO_TOPICS.find((topic) => topic.slug === slug)
}

export function matchesSeoTopic(item: TopicCandidate, slug: string): boolean {
  const text = searchableText(item)
  if (slug === "fashion") return FASHION_CATEGORIES.has(item.category)
  if (slug === "late-20s-style") return LATE_TWENTIES_PATTERN.test(text)
  if (slug === "30s-style") return THIRTIES_PATTERN.test(text)
  if (slug === "40s-style") return FORTIES_PATTERN.test(text)
  if (slug === "50s-style") return FIFTIES_PATTERN.test(text)
  if (slug === "60s-style") return SIXTIES_PATTERN.test(text)
  if (slug === "mens-fashion") return MENS_PATTERN.test(text) && !WOMENS_ONLY_PATTERN.test(text)
  return false
}

/**
 * SEO用の語を無条件に全記事へ付けず、本文に根拠があるテーマだけを補う。
 * 既存タグは保持し、表記違いによる重複だけを除く。
 */
export function withSeoTopicTags(item: TopicCandidate): string[] {
  const tags = [...item.tags]
  for (const topic of SEO_TOPICS) {
    if (matchesSeoTopic(item, topic.slug)) tags.push(topic.label)
  }
  const seen = new Set<string>()
  return tags.filter((tag) => {
    const trimmed = tag.trim()
    const key = trimmed.toLocaleLowerCase("ja")
    if (!trimmed || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function seoTopicsForArticle(item: TopicCandidate): SeoTopic[] {
  return SEO_TOPICS.filter((topic) => matchesSeoTopic(item, topic.slug))
}
