"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Article } from "@/lib/types"
import { categoryLabel } from "@/lib/site-config"

export function ArticlesList({ articles: initialArticles }: { articles: Article[] }) {
  const router = useRouter()
  const [articles, setArticles] = useState(initialArticles)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** router.refresh()だけに頼るとBlobの書き込み伝播遅延で削除後も一覧に残って見えるため、
   *  成功したらローカルstateから即座に取り除く(件数表示やページングはrefresh()側で追って整合させる) */
  async function deleteSelected() {
    if (selected.size === 0) return
    if (!window.confirm(`チェックした${selected.size}件を非公開にします（下書きに"却下"として残ります）。よろしいですか？`)) return
    setDeleting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/articles/delete-selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "削除に失敗しました")
      setMessage(`${data.deleted}件を非公開にしました`)
      setArticles((prev) => prev.filter((a) => !selected.has(a.id)))
      setSelected(new Set())
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button
          type="button"
          onClick={deleteSelected}
          disabled={selected.size === 0 || deleting}
          className="h-8 rounded-full border border-border px-4 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {deleting ? "処理中..." : `チェックした記事を削除${selected.size > 0 ? `(${selected.size})` : ""}`}
        </button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
      <p className="text-[11px] text-muted-foreground/70 mb-3">
        削除してもハードデリートではなく、下書きタブに却下済みとして残ります(サイトからは非表示)。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-6">
        {articles.map((a) => (
          <div key={a.id} className="flex flex-col gap-2 border border-border rounded-xl p-4">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selected.has(a.id)}
                onChange={() => toggle(a.id)}
                className="mt-1 size-4 shrink-0"
                aria-label={`${a.title}を選択`}
              />
              <Link href={`/admin/articles/${a.id}/edit`} className="font-bold text-sm hover:underline line-clamp-2">
                {a.title}
              </Link>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3">{a.excerpt}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-auto pt-1">
              {categoryLabel(a.category)} ・ {a.brands.join(", ") || "ブランドなし"} ・{" "}
              {new Date(a.publishedAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
