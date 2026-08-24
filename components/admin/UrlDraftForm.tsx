"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { stashDraftHandoff } from "@/lib/draft-handoff-client"
import type { Draft } from "@/lib/types"

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"

type GenerateTab = "url" | "text"

export function UrlDraftForm() {
  const [tab, setTab] = useState<GenerateTab>("url")

  const tabs: { key: GenerateTab; label: string }[] = [
    { key: "url", label: "URLから生成" },
    { key: "text", label: "本文から生成" },
  ]

  return (
    <section className="mb-12 rounded-xl border border-accent bg-accent/5 p-5">
      <h2 className="text-lg font-black mb-3">記事を生成</h2>
      <div className="flex gap-1 rounded-full bg-secondary p-1 w-fit mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`h-8 rounded-full px-4 text-xs font-semibold ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "url" && <UrlBatchTab />}
      {tab === "text" && <PasteTextTab />}
    </section>
  )
}

type UrlResult = { url: string; draftId?: string; title?: string; error?: string }

function UrlBatchTab() {
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
    <div>
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
    </div>
  )
}

/**
 * Bot対策(WAF Challenge等)でサーバー側から自動取得できないサイト向けの代替経路。
 * 人間が自分のブラウザで見えているページの本文をコピーして貼り付ければ、取得だけを
 * 省いて同じAI下書き生成(draftFromRawItem)にかけられる。
 */
function PasteTextTab() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/drafts/from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), title, text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成に失敗しました")
      stashDraftHandoff(data.draft as Draft)
      router.push(`/admin/drafts/${(data.draft as Draft).id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        Bot対策等でこちらから自動取得できないサイト向け。ページを自分のブラウザで開き、タイトルと本文をコピーしてここに貼り付けてください。取得だけを省き、AIによる下書き生成は通常通り行われます。
      </p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://...(元ページのURL)"
          className={inputClass}
          required
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル(ページの商品名・記事タイトルをそのまま貼り付け)"
          className={inputClass}
          required
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="本文をまるっと貼り付け(価格・発売日・型番・取り扱い店舗などが含まれているほど精度が上がります)"
          rows={8}
          className={inputClass}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 whitespace-nowrap"
        >
          {submitting ? "生成中…(数十秒かかります)" : "この内容で生成する"}
        </button>
      </form>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  )
}
