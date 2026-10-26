import Link from "next/link"
import type { Article } from "@/lib/types"
import { articleAnswerFacts } from "@/lib/article-answer-summary"

export function ArticleAnswerSummary({ article }: { article: Article }) {
  const facts = articleAnswerFacts(article)
  if (facts.length === 0 && article.brands.length === 0) return null

  return (
    <aside aria-labelledby="article-answer-title" className="mb-5 rounded-xl border border-border bg-secondary/30 p-4 sm:mb-8">
      <h2 id="article-answer-title" className="text-sm font-black">この記事の要点</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/80">{article.excerpt}</p>
      {facts.length > 0 && (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={`${fact.label}-${fact.value}`} className="rounded-lg bg-background px-3 py-2">
              <dt className="text-xs font-bold text-muted-foreground">{fact.label}</dt>
              <dd className="mt-0.5 font-bold">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {article.brands[0] && (
        <Link
          href={`/brand/${encodeURIComponent(article.brands[0])}`}
          className="mt-3 inline-flex text-sm font-bold underline decoration-accent decoration-2 underline-offset-4"
        >
          {article.brands[0]}の新着・発売情報を見る →
        </Link>
      )}
    </aside>
  )
}
