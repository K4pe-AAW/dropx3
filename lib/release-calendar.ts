import type { Article } from "./types"

export type ReleaseCalendarItem = {
  date: string
  article: Article
  label: string
}

const DATE_PATTERN = /(?:(\d{4})年\s*)?(\d{1,2})月\s*(\d{1,2})日/g

function exactDates(text: string, publishedAt: string): string[] {
  const published = new Date(publishedAt)
  const results: string[] = []
  for (const match of text.matchAll(DATE_PATTERN)) {
    let year = match[1] ? Number(match[1]) : published.getFullYear()
    const month = Number(match[2])
    const day = Number(match[3])
    if (!match[1]) {
      const candidate = new Date(year, month - 1, day)
      if (candidate.getTime() < published.getTime() - 180 * 864e5) year += 1
    }
    const date = new Date(year, month - 1, day)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) continue
    results.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
  }
  return results
}

export function buildReleaseCalendar(articles: Article[]): ReleaseCalendarItem[] {
  const seen = new Set<string>()
  const items: ReleaseCalendarItem[] = []
  for (const article of articles) {
    const structured = [
      ...(article.colorways ?? []).map((item) => item.releaseDate ?? ""),
      ...(article.purchaseChannels ?? []).filter((item) => item.saleMethod === "regular").map((item) => item.date ?? ""),
    ].filter(Boolean)
    const sources = structured.length > 0
      ? structured
      : [article.title, ...article.bodyParagraphs.filter((paragraph) => /発売|販売開始|リリース/.test(paragraph))]
    for (const source of sources) {
      for (const date of exactDates(source, article.publishedAt)) {
        const key = `${date}:${article.id}`
        if (seen.has(key)) continue
        seen.add(key)
        items.push({ date, article, label: source })
      }
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date))
}
