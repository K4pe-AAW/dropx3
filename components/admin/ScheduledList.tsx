"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { ScheduledArticle } from "@/lib/types"
import { categoryLabel } from "@/lib/site-config"

function formatScheduledAt(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function ScheduledList({ scheduled: initialScheduled }: { scheduled: ScheduledArticle[] }) {
  const router = useRouter()
  const [scheduled, setScheduled] = useState(initialScheduled)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  /** router.refresh()だけに頼るとBlobの書き込み伝播遅延でキャンセル後も一覧に残って見えるため、
   *  成功したらローカルstateから即座に取り除く(CrawlSourcesManagerと同じ理由) */
  async function cancel(id: string, title: string) {
    if (!window.confirm(`「${title}」の予約公開をキャンセルしますか？(内容は破棄されます)`)) return
    setCancelingId(id)
    try {
      await fetch(`/api/admin/scheduled/${id}`, { method: "DELETE" })
      setScheduled((prev) => prev.filter((a) => a.id !== id))
      router.refresh()
    } finally {
      setCancelingId(null)
    }
  }

  if (scheduled.length === 0) return null

  return (
    <div className="mb-10">
      <h2 className="text-sm font-bold mb-3">予約公開待ち（{scheduled.length}件）</h2>
      <ul className="space-y-2">
        {scheduled.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center gap-3 border border-border rounded-xl px-4 py-3"
          >
            <span className="text-xs font-bold text-accent-foreground shrink-0">{formatScheduledAt(a.scheduledPublishAt)}</span>
            <span className="text-sm font-semibold flex-1 min-w-0 truncate">{a.title}</span>
            <span className="text-[11px] text-muted-foreground shrink-0">{categoryLabel(a.category)}</span>
            <button
              type="button"
              onClick={() => cancel(a.id, a.title)}
              disabled={cancelingId === a.id}
              className="shrink-0 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              {cancelingId === a.id ? "処理中..." : "キャンセル"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
