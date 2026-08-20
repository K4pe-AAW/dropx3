"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { YoutubeCrawlSource, BrandCrawlSource } from "@/lib/types"

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"

export function CrawlSourcesManager({
  youtube,
  brands,
}: {
  youtube: YoutubeCrawlSource[]
  brands: BrandCrawlSource[]
}) {
  return (
    <div className="space-y-12">
      <YoutubeSection youtube={youtube} />
      <BrandSection brands={brands} />
    </div>
  )
}

export function YoutubeSection({ youtube }: { youtube: YoutubeCrawlSource[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await fetch("/api/admin/crawl-sources/youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? "追加に失敗しました")
      return
    }
    setName("")
    setUrl("")
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm("このチャンネルを収集対象から外しますか？")) return
    setDeletingId(id)
    await fetch(`/api/admin/crawl-sources/youtube/${id}`, { method: "DELETE" })
    setDeletingId(null)
    router.refresh()
  }

  return (
    <section>
      <h2 className="text-lg font-black mb-1">YouTubeチャンネル</h2>
      <p className="text-xs text-muted-foreground mb-4">
        ここに登録したチャンネルの新着動画を、RSS収集(6時間おき)が自動で下書き化の対象にします。
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-6 items-start">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="表示名(例: OVY公式)"
          className={`${inputClass} max-w-56`}
          required
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="チャンネルURL(https://www.youtube.com/@ハンドル または /channel/UC...)"
          className={`${inputClass} flex-1 min-w-72`}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 whitespace-nowrap"
        >
          {submitting ? "追加中…" : "+ 追加"}
        </button>
      </form>
      {error && <p className="text-xs text-destructive mb-4">{error}</p>}

      {youtube.length === 0 ? (
        <p className="text-sm text-muted-foreground">登録されているチャンネルはありません。</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {youtube.map((y) => (
            <li key={y.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{y.name}</p>
                <a
                  href={y.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate block"
                >
                  {y.siteUrl}
                </a>
              </div>
              <button
                onClick={() => handleDelete(y.id)}
                disabled={deletingId === y.id}
                className="text-xs font-bold text-destructive hover:underline shrink-0 disabled:opacity-50"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function BrandSection({ brands }: { brands: BrandCrawlSource[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await fetch("/api/admin/crawl-sources/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url, instagramUrl: instagramUrl || undefined }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? "追加に失敗しました")
      return
    }
    setName("")
    setUrl("")
    setInstagramUrl("")
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm("このブランドを画像取得先の一覧から外しますか？")) return
    setDeletingId(id)
    await fetch(`/api/admin/crawl-sources/brands/${id}`, { method: "DELETE" })
    setDeletingId(null)
    router.refresh()
  }

  return (
    <section>
      <h2 className="text-lg font-black mb-1">ブランド公式サイト</h2>
      <p className="text-xs text-muted-foreground mb-4">
        下書きレビュー画面でカバー画像を探す際の候補として表示されます(画像の自動取得はしません)。
        必ずブランド自身のドメインか、掲載画像に第三者の撮影クレジットが入っていないか確認してから追加してください。
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-6 items-start">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ブランド名(例: AURALEE)"
          className={`${inputClass} max-w-48`}
          required
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="公式サイトURL"
          className={`${inputClass} flex-1 min-w-56`}
          required
        />
        <input
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          placeholder="Instagram URL(任意)"
          className={`${inputClass} flex-1 min-w-56`}
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 whitespace-nowrap"
        >
          {submitting ? "追加中…" : "+ 追加"}
        </button>
      </form>
      {error && <p className="text-xs text-destructive mb-4">{error}</p>}

      {brands.length === 0 ? (
        <p className="text-sm text-muted-foreground">登録されているブランドはありません。</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {brands.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{b.name}</p>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate block"
                >
                  {b.url}
                </a>
              </div>
              <button
                onClick={() => handleDelete(b.id)}
                disabled={deletingId === b.id}
                className="text-xs font-bold text-destructive hover:underline shrink-0 disabled:opacity-50"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
