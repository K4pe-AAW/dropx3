"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function CollectButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/collect", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "失敗しました")
      setMessage(`取得${data.fetched}件 / 下書き追加${data.drafted}件`)
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
      >
        {loading ? "収集中..." : "収集を実行"}
      </button>
    </div>
  )
}
