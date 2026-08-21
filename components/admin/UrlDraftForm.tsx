"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { stashDraftHandoff } from "@/lib/draft-handoff-client"

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"

export function UrlDraftForm() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/drafts/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成に失敗しました")
      if (data.draft) stashDraftHandoff(data.draft)
      router.push(`/admin/drafts/${data.draftId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成に失敗しました")
      setSubmitting(false)
    }
  }

  return (
    <section className="mb-12 rounded-xl border border-accent bg-accent/5 p-5">
      <h2 className="text-lg font-black mb-1">URLから記事を生成</h2>
      <p className="text-xs text-muted-foreground mb-4">
        気になる記事のURLを貼るとその場でAIが下書きを生成し、編集画面が開きます。RSS収集(6時間おき)を待たずに新鮮なうちに記事化したいときに使ってください。
        自動公開はしないので、内容を確認してから公開ボタンを押してください。
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-start">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          type="url"
          className={`${inputClass} flex-1 min-w-72`}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 whitespace-nowrap"
        >
          {submitting ? "生成中…(数十秒かかります)" : "生成する"}
        </button>
      </form>
      {error && <p className="text-xs text-destructive mt-3">{error}</p>}
    </section>
  )
}
