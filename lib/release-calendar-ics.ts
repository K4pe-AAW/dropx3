import type { ReleaseCalendarItem } from "./release-calendar"

function escapeIcs(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;")
}

export function buildReleaseCalendarIcs(items: ReleaseCalendarItem[], siteUrl: string, generatedAt = new Date()): string {
  const stamp = generatedAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
  const events = items.map(({ date, article }) => {
    const dateValue = date.replaceAll("-", "")
    const next = new Date(`${date}T00:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    const nextValue = next.toISOString().slice(0, 10).replaceAll("-", "")
    const url = new URL(`/articles/${article.slug}`, siteUrl).toString()
    return [
      "BEGIN:VEVENT",
      `UID:${escapeIcs(`${date}-${article.id}@dropx3.com`)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue}`,
      `DTEND;VALUE=DATE:${nextValue}`,
      `SUMMARY:${escapeIcs(article.title)}`,
      `DESCRIPTION:${escapeIcs(`${article.brands.join(" / ")}の発売情報。最新情報は記事と公式サイトで確認してください。`)}`,
      `URL:${url}`,
      "END:VEVENT",
    ].join("\r\n")
  })
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DROP DROP DROP//Release Calendar//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:DROP発売カレンダー",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n")
}
