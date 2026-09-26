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
const THIRTIES_PATTERN = /(?:30代|アラサー|30歳代|仕事(?:着|服|コーデ)|通勤(?:着|服|コーデ)|オンオフ兼用|オンにもオフにも|きれいめ(?:カジュアル|コーデ|スタイル)|休日(?:服|コーデ)|都会的(?:な|に)?(?:着こなし|スタイル)|上質な普段着)/i
const FORTIES_PATTERN = /(?:40代|アラフォー|ミドル世代|大人(?:の|向け)?(?:服|ファッション|コーデ|スタイル|着こなし)|上品(?:な|に)?(?:着こなし|スタイル)|定番として|長く使える|タイムレス|クラシック)/i

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
  if (slug === "30s-style") return THIRTIES_PATTERN.test(text)
  if (slug === "40s-style") return FORTIES_PATTERN.test(text)
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
