"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { stashDraftHandoff } from "@/lib/draft-handoff-client"
import type { Draft } from "@/lib/types"

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"

type UrlResult = { url: string; draftId?: string; title?: string; error?: string }

export function UrlDraftForm() {
  const router = useRouter()
  const [urlsText, setUrlsText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<UrlResult[] | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const urls = Array.from(new Set(urlsText.split("\n").map((u) => u.trim()).filter(Boolean)))
    if (urls.length === 0) return

    setSubmitting(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch("/api/admin/drafts/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成に失敗しました")

      const rawResults = data.results as { url: string; draft?: Draft; error?: string }[]

      // 1件だけ・成功した場合はこれまで通りその場で編集画面へ遷移する(挙動を変えない)
      if (rawResults.length === 1 && rawResults[0].draft) {
        stashDraftHandoff(rawResults[0].draft)
        router.push(`/admin/drafts/${rawResults[0].draft.id}`)
        return
      }

      setResults(
        rawResults.map((r) => ({
          url: r.url,
          draftId: r.draft?.id,
          title: r.draft?.title,
          error: r.error,
        }))
      )
      setUrlsText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mb-12 rounded-xl border border-accent bg-accent/5 p-5">
      <h2 className="text-lg font-black mb-1">URLから記事を生成</h2>
      <p className="text-xs text-muted-foreground mb-4">
        気になる記事のURLを貼るとその場でAIが下書きを生成し、編集画面が開きます。複数貼り付ければ(改行区切り、最大6件まで)まとめて生成できます。RSS収集(6時間おき)を待たずに新鮮なうちに記事化したいときに使ってください。
        自動公開はしないので、内容を確認してから公開ボタンを押してください。
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-start">
        <textarea
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder={"https://...\nhttps://...(複数の場合は改行区切りで)"}
          rows={2}
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
      {results && (
        <ul className="mt-3 space-y-1.5">
          {results.map((r, i) => (
            <li key={i} className="text-xs flex items-start gap-1.5">
              {r.draftId ? (
                <>
                  <span className="text-accent-foreground">✓</span>
                  <a href={`/admin/drafts/${r.draftId}`} className="underline hover:text-foreground">
                    {r.title || r.url}
                  </a>
                </>
              ) : (
                <>
                  <span className="text-destructive">✗</span>
                  <span className="text-muted-foreground">
                    {r.url} — {r.error}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
