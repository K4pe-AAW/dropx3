"use client"

import { useState } from "react"
import type { ProductCard as ProductCardData } from "@/lib/source-watch/present"
import type { Source } from "@/lib/source-watch/types"

/**
 * 「Instagram投稿URLを貼る」バー。Meta公式APIでは第三者アカウントの新着投稿を自動検知できないため、
 * 人間がInstagramで見た投稿のURLと本文(キャプション)を貼ることで、数秒でAI解析→商品候補化する
 * (投稿の自動取得・スクレイピングは行わない)。
 */
export function AnalyzeUrlBar({ sources, onAnalyzed }: { sources: Source[]; onAnalyzed: (card: ProductCardData) => void }) {
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "")
  const [url, setUrl] = useState("")
  const [caption, setCaption] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function analyze() {
    if (!sourceId || !url.trim() || !caption.trim()) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/admin/source-watch/social/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, url: url.trim(), caption: caption.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onAnalyzed(data as ProductCardData)
      setUrl("")
      setCaption("")
      setExpanded(false)
      setSuccess("解析して商品候補に追加しました。")
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-5 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
          {sources.length === 0 && <option value="">アカウント未登録</option>}
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          className="h-9 min-w-[240px] flex-1 rounded-md border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
          placeholder="Instagram投稿URLを貼る........................"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            if (e.target.value.trim()) setExpanded(true)
          }}
        />
        <button
          onClick={analyze}
          disabled={loading || !sourceId || !url.trim() || !caption.trim()}
          className="h-9 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          {loading ? "解析中..." : "解析"}
        </button>
      </div>

      {(expanded || caption) && (
        <div className="mt-2">
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            placeholder="投稿のキャプション本文をここに貼り付けてください(自動取得はしません。Instagramで見た内容をそのままコピペ)"
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
      {success && <p className="mt-2 text-[11px] text-emerald-700">{success}</p>}
    </div>
  )
}
