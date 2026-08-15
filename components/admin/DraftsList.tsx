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
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [scheduledPublishAt, setScheduledPublishAt] = useState("")

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

  async function publishSelected() {
    if (selected.size === 0) return
    const isScheduled = Boolean(scheduledPublishAt)
    const confirmText = isScheduled
      ? `チェックした${selected.size}件を予約公開します（カバー画像が無いものは自動でスキップされます）。よろしいですか？`
      : `チェックした${selected.size}件を今すぐ公開します（カバー画像が無いものは自動でスキップされます）。よろしいですか？`
    if (!window.confirm(confirmText)) return
    setPublishing(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/drafts/publish-selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          ...(isScheduled ? { scheduledPublishAt: new Date(scheduledPublishAt).toISOString() } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "公開に失敗しました")
      const parts = [`${data.published}件を${data.scheduled ? "予約" : "公開"}しました`]
      if (data.skipped > 0) parts.push(`${data.skipped}件はカバー画像未設定のためスキップ`)
      setMessage(parts.join(" / "))
      setSelected(new Set())
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setPublishing(false)
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
          {deleting ? "削除中..." : `チェックした記事を削除${selected.size > 0 ? `(${selected.size})` : ""}`}
        </button>
        <button
          type="button"
          onClick={publishSelected}
          disabled={selected.size === 0 || publishing}
          className="h-8 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          {publishing
            ? "処理中..."
            : `チェックした記事を${scheduledPublishAt ? "予約公開" : "まとめて公開"}${selected.size > 0 ? `(${selected.size})` : ""}`}
        </button>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          公開日時
          <input
            type="datetime-local"
            value={scheduledPublishAt}
            onChange={(e) => setScheduledPublishAt(e.target.value)}
            className="h-8 rounded-lg border border-border px-2 text-xs outline-none focus:ring-2 focus:ring-ring bg-background"
          />
        </label>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
      <p className="text-[11px] text-muted-foreground/70 mb-3">
        公開日時を指定するとその時刻まで非公開のまま予約されます。空欄なら即座に公開します。カバー画像が未設定の下書き(下のカードに「画像未設定」と表示)は一括公開の対象外です——個別に開いて設定してください。
      </p>

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
              {!d.suggestedCoverImage && (
                <span className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  画像未設定
                </span>
              )}
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
