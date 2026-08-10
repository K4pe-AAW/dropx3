"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

type ArticleSummary = { id: string; slug: string; title: string }

export function ArticleSearch({ articles }: { articles: ArticleSummary[] }) {
  const [query, setQuery] = useState("")

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return articles.filter((a) => a.title.toLowerCase().includes(q)).slice(0, 20)
  }, [query, articles])

  return (
    <div>
      <input
        className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
        placeholder="タイトルで検索して編集する記事を探す"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((a) => (
            <li key={a.id} className="border border-border rounded-lg px-3 py-2">
              <Link href={`/admin/articles/${a.id}/edit`} className="text-sm hover:underline">
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && results.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">該当する記事が見つかりません。</p>
      )}
    </div>
  )
}
