import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

/**
 * 一時診断API。公開済み記事の本文・購入チャンネル日程に含まれる西暦年を洗い出し、
 * 記事の公開年より古い年が混じっている(=AIが発売日に存在しない年を捏造した疑いがある)
 * 記事をリストアップする。使用後に削除すること。
 */
export async function GET() {
  const articles = await getAllArticles()

  const results = articles.map((a) => {
    const publishedYear = new Date(a.publishedAt).getFullYear()
    const bodyText = a.bodyParagraphs.join("\n")
    const channelDates = (a.purchaseChannels ?? []).map((c) => c.date).filter(Boolean).join(" / ")
    const haystack = `${bodyText}\n${channelDates}`
    const matches = [...haystack.matchAll(/(20\d{2})年/g)]
    const years = [...new Set(matches.map((m) => Number(m[1])))]
    const suspicious = years.some((y) => y < publishedYear)
    const contexts = matches
      .filter((m) => Number(m[1]) < publishedYear)
      .map((m) => haystack.slice(Math.max(0, (m.index ?? 0) - 25), (m.index ?? 0) + 25))
    return {
      slug: a.slug,
      title: a.title,
      publishedAt: a.publishedAt,
      publishedYear,
      yearsFoundInBody: years,
      suspicious,
      contexts,
    }
  })

  const suspiciousOnes = results.filter((r) => r.suspicious)

  return NextResponse.json({
    totalArticles: articles.length,
    suspiciousCount: suspiciousOnes.length,
    suspicious: suspiciousOnes,
  })
}
