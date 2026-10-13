import type { Metadata } from "next"
import Link from "next/link"
import { getAllArticles } from "@/lib/storage"
import { buildReleaseCalendar } from "@/lib/release-calendar"
import { siteConfig } from "@/lib/site-config"
import { TrackedLink } from "@/components/TrackedLink"
import { canonicalBrandName } from "@/lib/brands"

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

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const { brand } = await searchParams
  const articles = await getAllArticles()
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date())
  const earliest = new Date(`${today}T00:00:00+09:00`)
  earliest.setDate(earliest.getDate() - 14)
  const earliestKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(earliest)
  const selectedBrand = brand ? canonicalBrandName(decodeURIComponent(brand)) : undefined
  const allItems = buildReleaseCalendar(articles).filter((item) => item.date >= earliestKey)
  const brands = [...new Set(allItems.flatMap((item) => item.article.brands.map(canonicalBrandName)))].sort((a, b) => a.localeCompare(b, "ja"))
  const items = selectedBrand
    ? allItems.filter((item) => item.article.brands.some((itemBrand) => canonicalBrandName(itemBrand) === selectedBrand))
    : allItems
  const upcoming = items.filter((item) => item.date >= today)
  const recent = items.filter((item) => item.date < today).reverse()

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <p className="text-[10px] font-black tracking-[0.22em] text-accent">DROP CALENDAR</p>
      <h1 className="mb-2 text-2xl font-black sm:text-3xl">発売日カレンダー</h1>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        記事で確認できた発売日をまとめています。価格・販売方法・在庫は各記事の公式リンクから確認してください。
      </p>
      <div className="mb-7 flex flex-wrap items-center gap-2">
        <Link href="/calendar" className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selectedBrand ? "border-border" : "border-foreground bg-foreground text-background"}`}>すべて</Link>
        {brands.map((brandName) => (
          <Link key={brandName} href={`/calendar?brand=${encodeURIComponent(brandName)}`} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selectedBrand === brandName ? "border-foreground bg-foreground text-background" : "border-border"}`}>
            {brandName}
          </Link>
        ))}
      </div>
      <a href="/calendar.ics" className="mb-8 inline-flex min-h-11 items-center rounded-full border border-accent px-4 py-2 text-sm font-bold hover:bg-accent hover:text-accent-foreground">
        発売予定をカレンダーに追加
      </a>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">発売日を確認できる記事はまだありません。</p>
      ) : (
        <div className="space-y-10">
          <CalendarSection title="今後の発売予定" items={upcoming} />
          {recent.length > 0 && <CalendarSection title="直近14日間の発売" items={recent} />}
        </div>
      )}
    </div>
  )
}

function CalendarSection({ title, items }: { title: string; items: ReturnType<typeof buildReleaseCalendar> }) {
  const groups = new Map<string, typeof items>()
  for (const item of items) groups.set(item.date, [...(groups.get(item.date) ?? []), item])
  if (groups.size === 0) return (
    <section>
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">該当する発売情報はありません。</p>
    </section>
  )
  return (
    <section>
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      <div className="space-y-7">
        {[...groups.entries()].map(([date, dateItems]) => (
          <div key={date} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[180px_1fr]">
            <h3 className="font-black">{displayDate(date)}</h3>
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
          </div>
        ))}
      </div>
    </section>
  )
}
