import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

const MATERIAL_KEYWORDS = ["GORE-TEX", "ゴアテックス", "Vibram", "ビブラム", "Cordura", "コーデュラ", "PrimaLoft", "プリマロフト", "Thinsulate", "シンサレート"]

export async function GET() {
  const articles = await getAllArticles()
  const hits = articles
    .map((a) => {
      const bodyText = a.bodyParagraphs.join("\n")
      const matchedKeywords = MATERIAL_KEYWORDS.filter((kw) => bodyText.includes(kw))
      if (matchedKeywords.length === 0) return null
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        publishedAt: a.publishedAt,
        matchedKeywords,
        sourceRefs: a.sourceRefs,
        bodyParagraphs: a.bodyParagraphs,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return NextResponse.json({ count: hits.length, hits })
}
