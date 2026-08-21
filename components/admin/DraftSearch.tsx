"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

type DraftSummary = { id: string; title: string; brands: string[] }

/** ArticleSearch(公開済み記事の検索)と同じ使用感。タブ・ページを跨いで全下書きから探せるよう
 * タイトルだけでなくブランド名も対象にする(下書きはカテゴリタブで分かれているため、
 * 「あのブランドの下書きどこだっけ」で探すケースがタイトル検索だけより多いと想定) */
export function DraftSearch({ drafts }: { drafts: DraftSummary[] }) {
  const [query, setQuery] = useState("")

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return drafts
      .filter((d) => d.title.toLowerCase().includes(q) || d.brands.some((b) => b.toLowerCase().includes(q)))
      .slice(0, 20)
  }, [query, drafts])

  return (
    <div className="mb-6">
      <input
        className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
        placeholder="タイトル・ブランド名で下書きを検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((d) => (
            <li key={d.id} className="border border-border rounded-lg px-3 py-2">
              <Link href={`/admin/drafts/${d.id}`} className="text-sm hover:underline">
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && results.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">該当する下書きが見つかりません。</p>
      )}
    </div>
  )
}
