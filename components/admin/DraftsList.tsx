"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Draft } from "@/lib/types"
import { categoryLabel } from "@/lib/site-config"

export function DraftsList({ drafts }: { drafts: Draft[] }) {
  const router = useRouter()
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

  async function deleteSelected() {
    if (selected.size === 0) return
    if (!window.confirm(`チェックした${selected.size}件を削除します。よろしいですか？`)) return
    setDeleting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/drafts/delete-selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "削除に失敗しました")
      setMessage(`${data.deleted}件削除しました`)
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
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={deleteSelected}
          disabled={selected.size === 0 || deleting}
          className="h-8 rounded-full border border-border px-4 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {deleting ? "削除中..." : `チェックした記事を削除${selected.size > 0 ? `(${selected.size})` : ""}`}
        </button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-6">
        {drafts.map((d) => (
          <div key={d.id} className="flex flex-col gap-2 border border-border rounded-xl p-4">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selected.has(d.id)}
                onChange={() => toggle(d.id)}
                className="mt-1 size-4 shrink-0"
                aria-label={`${d.title}を選択`}
              />
              <Link href={`/admin/drafts/${d.id}`} className="font-bold text-sm hover:underline line-clamp-2">
                {d.title}
              </Link>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3">{d.excerpt}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-auto pt-1">
              {categoryLabel(d.category)} ・ {d.brands.join(", ") || "ブランドなし"} ・ 出典:{" "}
              {d.sourceRefs.map((r) => r.name).join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
