import type { Metadata } from "next"
import Link from "next/link"
import { getAllArticles } from "@/lib/storage"
import { buildReleaseCalendar } from "@/lib/release-calendar"
import { siteConfig } from "@/lib/site-config"
import { TrackedLink } from "@/components/TrackedLink"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "発売日カレンダー",
  description: "スニーカー、ファッション、コラボ商品の発売予定を日付順に確認できます。",
  alternates: { canonical: new URL("/calendar", siteConfig.url).toString() },
}

function displayDate(date: string): string {
  const value = new Date(`${date}T00:00:00+09:00`)
  const weekday = new Intl.DateTimeFormat("ja-JP", { weekday: "short", timeZone: "Asia/Tokyo" }).format(value)
  return `${value.getFullYear()}年${value.getMonth() + 1}月${value.getDate()}日（${weekday}）`
}

export default async function CalendarPage() {
  const articles = await getAllArticles()
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date())
  const earliest = new Date(`${today}T00:00:00+09:00`)
  earliest.setDate(earliest.getDate() - 14)
  const earliestKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(earliest)
  const items = buildReleaseCalendar(articles).filter((item) => item.date >= earliestKey)
  const groups = new Map<string, typeof items>()
  for (const item of items) groups.set(item.date, [...(groups.get(item.date) ?? []), item])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <p className="text-[10px] font-black tracking-[0.22em] text-accent">DROP CALENDAR</p>
      <h1 className="mb-2 text-2xl font-black sm:text-3xl">発売日カレンダー</h1>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        記事で確認できた発売日をまとめています。価格・販売方法・在庫は各記事の公式リンクから確認してください。
      </p>
      {groups.size === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">発売日を確認できる記事はまだありません。</p>
      ) : (
        <div className="space-y-7">
          {[...groups.entries()].map(([date, dateItems]) => (
            <section key={date} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[180px_1fr]">
              <h2 className="font-black">{displayDate(date)}</h2>
              <div className="space-y-3">
                {dateItems.map(({ article }) => (
                  <TrackedLink key={article.id} event="internal_article_click" params={{ article_id: article.id, placement: "calendar" }}>
                    <Link href={`/articles/${article.slug}`} className="group flex gap-3 rounded-xl border border-border p-3 hover:bg-secondary/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={article.coverImage} alt="" loading="lazy" decoding="async" width="80" height="60" className="h-[60px] w-20 shrink-0 rounded-lg object-cover" />
                      <span>
                        <span className="block text-xs font-bold text-muted-foreground">{article.brands[0] ?? "DROP DROP DROP"}</span>
                        <span className="line-clamp-2 text-sm font-bold leading-snug group-hover:underline">{article.title}</span>
                      </span>
                    </Link>
                  </TrackedLink>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
