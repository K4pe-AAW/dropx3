"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function DeleteAllDraftsButton({ count }: { count: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleClick() {
    if (!window.confirm(`レビュー待ちの下書き${count}件を全て削除します。よろしいですか？`)) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/drafts/delete-all", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "失敗しました")
      setMessage(`${data.deleted}件削除しました`)
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  if (count === 0) return null

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="h-9 px-4 rounded-full border border-border text-xs font-semibold disabled:opacity-50 hover:bg-secondary"
      >
        {loading ? "削除中..." : "下書きを全て削除"}
      </button>
    </div>
  )
}
