import type { Metadata } from "next"
import Link from "next/link"
import { SEO_TOPICS } from "@/lib/seo-topics"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "年代からファッションを探す｜20代後半・30代・40代・50代・60代",
  description: "20代後半から60代まで、仕事と休日、上質素材、着心地、歩きやすさなど年代ごとの視点からファッション記事を探せます。",
  alternates: { canonical: new URL("/style-by-age", siteConfig.url).toString() },
  openGraph: {
    title: "年代からファッションを探す",
    description: "年齢で服を限定せず、20代後半から60代まで自分に合う視点で記事を探せます。",
    url: new URL("/style-by-age", siteConfig.url).toString(),
    type: "website",
  },
}

const AGE_SLUGS = ["late-20s-style", "30s-style", "40s-style", "50s-style", "60s-style"] as const
const AGE_HINTS: Record<(typeof AGE_SLUGS)[number], string> = {
  "late-20s-style": "トレンドと、先まで使える定番",
  "30s-style": "仕事と休日をつなぐ服",
  "40s-style": "素材・シルエット・合わせやすさ",
  "50s-style": "品のよさと快適な大人カジュアル",
  "60s-style": "軽さ・歩きやすさ・着心地",
}

export default function StyleByAgePage() {
  const ageTopics = AGE_SLUGS.map((slug) => SEO_TOPICS.find((topic) => topic.slug === slug)).filter(Boolean)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-12">
      <header className="max-w-3xl">
        <p className="text-xs font-black tracking-[0.2em] text-muted-foreground">STYLE BY AGE</p>
        <h1 className="mt-2 text-2xl font-black sm:text-4xl">20代後半から60代まで、好きな服を。</h1>
        <p className="mt-4 text-sm leading-[1.9] text-foreground/80 sm:text-base">
          年齢で着る服を決めるのではなく、暮らしや選び方の変化に合わせて記事を探すための入口です。
          同じスニーカーやジャケットでも、トレンド、仕事、素材、快適さなど、自分がいま大切にする視点から選べます。
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="年代別ファッション">
        {ageTopics.map((topic) => topic && (
          <Link
            key={topic.slug}
            href={`/tag/${topic.slug}`}
            className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md"
          >
            <p className="text-lg font-black group-hover:underline group-hover:underline-offset-4">{topic.label}</p>
            <p className="mt-3 text-xs font-bold leading-relaxed text-muted-foreground">{AGE_HINTS[topic.slug as keyof typeof AGE_HINTS]}</p>
          </Link>
        ))}
      </section>

      <section className="mt-10 rounded-2xl bg-muted/50 p-5 sm:p-7">
        <h2 className="text-lg font-black">DROP DROP DROPの考え方</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/80">
          <li>・年齢だけを理由に、着るブランドや色を限定しません。</li>
          <li>・記事内容に根拠がある場合だけ年代テーマへ分類します。</li>
          <li>・年代をまたいで役立つ記事は、複数の入口から見つけられます。</li>
        </ul>
        <Link href="/tag/fashion" className="mt-5 inline-flex font-bold underline underline-offset-4">年代を問わず、すべてのファッション記事を見る</Link>
      </section>
    </main>
  )
}
