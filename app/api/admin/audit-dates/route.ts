import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/storage"

/**
 * 一時診断API(第2弾)。前回はbodyParagraphs/purchaseChannels.dateのみを見ていたが、
 * colorways.releaseDate(SOURCE WATCH由来の記事が使う構造化フィールド)を見落としていたため
 * 追加した。公開年より古い年が混じっている記事をリストアップする。使用後に削除すること。
 */
export async function GET() {
  const articles = await getAllArticles()

  const results = articles.map((a) => {
    const publishedYear = new Date(a.publishedAt).getFullYear()
    const bodyText = a.bodyParagraphs.join("\n")
    const channelDates = (a.purchaseChannels ?? []).map((c) => c.date).filter(Boolean).join(" / ")
    const colorwayDates = (a.colorways ?? []).map((c) => c.releaseDate).filter(Boolean).join(" / ")
    const haystack = `${bodyText}\n${channelDates}\n${colorwayDates}`
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
      hasColorwayDates: colorwayDates.length > 0,
      colorwayDatesRaw: colorwayDates,
    }
  })

  const suspiciousOnes = results.filter((r) => r.suspicious)

  return NextResponse.json({
    totalArticles: articles.length,
    suspiciousCount: suspiciousOnes.length,
    suspicious: suspiciousOnes,
  })
}
