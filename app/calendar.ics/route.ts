import { getAllArticles } from "@/lib/storage"
import { buildReleaseCalendar } from "@/lib/release-calendar"
import { buildReleaseCalendarIcs } from "@/lib/release-calendar-ics"
import { siteConfig } from "@/lib/site-config"

export const dynamic = "force-dynamic"

export async function GET() {
  const articles = await getAllArticles()
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date())
  const items = buildReleaseCalendar(articles).filter((item) => item.date >= today).slice(0, 300)
  return new Response(buildReleaseCalendarIcs(items, siteConfig.url), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="drop-release-calendar.ics"',
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
