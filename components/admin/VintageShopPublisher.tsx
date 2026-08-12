"use client"

import { useState, type ReactNode } from "react"

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"

const SHOPS = [
  { key: "tonari", label: "tonari(祐天寺)" },
  { key: "ROOM", label: "ROOM(三軒茶屋)" },
]

/**
 * クラウド自動化ルーティンがInstagramへ到達できない(egressプロキシでブロック、2026-08-12確認)ため、
 * 人間がInstagramを見てURL+キャプション+写真を貼る半自動フローに切り替えた画面。
 * AIはキャプション本文から下書き文章を提案するのみで、画像の取得・公開の最終判断は必ず人間が行う。
 */
export function VintageShopPublisher() {
  const [shop, setShop] = useState(SHOPS[0].key)
  const [postUrl, setPostUrl] = useState("")
  const [caption, setCaption] = useState("")
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [mercariSearchQuery, setMercariSearchQuery] = useState("")
  const [tagsText, setTagsText] = useState("古着")
  const [coverImageAlt, setCoverImageAlt] = useState("")
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])

  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [result, setResult] = useState<{ merged: boolean; slug: string } | null>(null)

  async function generateDraft() {
    if (!postUrl.trim() || !caption.trim()) return
    setDrafting(true)
    setDraftError(null)
    try {
      const res = await fetch("/api/admin/vintage-shop/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, postUrl: postUrl.trim(), caption: caption.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTitle(data.title)
      setExcerpt(data.excerpt)
      setBodyText((data.bodyParagraphs as string[]).join("\n\n"))
      setMercariSearchQuery(data.mercariSearchQuery)
      setTagsText((data.tags as string[]).join(", "))
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "下書き生成に失敗しました")
    } finally {
      setDrafting(false)
    }
  }

  async function publish() {
    if (!coverImageFile) {
      setPublishError("カバー画像を選択してください")
      return
    }
    setPublishing(true)
    setPublishError(null)
    setResult(null)
    try {
      const fd = new FormData()
      fd.set("shop", shop)
      fd.set("postUrl", postUrl.trim())
      fd.set("title", title.trim())
      fd.set("excerpt", excerpt.trim())
      fd.set(
        "bodyParagraphs",
        JSON.stringify(
          bodyText
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean)
        )
      )
      fd.set("tags", JSON.stringify(tagsText.split(",").map((t) => t.trim()).filter(Boolean)))
      fd.set("mercariSearchQuery", mercariSearchQuery.trim())
      fd.set("coverImageAlt", coverImageAlt.trim())
      fd.set("coverImage", coverImageFile)
      for (const f of galleryFiles) fd.append("galleryImages", f)

      const res = await fetch("/api/admin/vintage-shop/publish", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({ merged: data.merged, slug: data.slug })
      setPostUrl("")
      setCaption("")
      setTitle("")
      setExcerpt("")
      setBodyText("")
      setMercariSearchQuery("")
      setTagsText("古着")
      setCoverImageAlt("")
      setCoverImageFile(null)
      setGalleryFiles([])
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "公開に失敗しました")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Instagramで新着投稿を見たら、そのショップ・投稿URL・キャプション本文をここに貼り付けてください
          (自動取得はしません)。AIが下書き文章を提案するので、内容を確認・修正してから画像をアップロードし公開します。
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ショップ">
            <select className={inputClass} value={shop} onChange={(e) => setShop(e.target.value)}>
              {SHOPS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="投稿URL">
            <input
              className={inputClass}
              placeholder="https://www.instagram.com/.../p/xxxxx/"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="キャプション本文">
            <textarea
              className={inputClass}
              rows={4}
              placeholder="Instagramで見たキャプションをそのまま貼り付け"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={generateDraft}
          disabled={drafting || !postUrl.trim() || !caption.trim()}
          className="mt-3 h-9 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          {drafting ? "生成中..." : "AI下書き生成"}
        </button>
        {draftError && <p className="mt-2 text-[11px] text-destructive">{draftError}</p>}
      </div>

      <div className="space-y-4">
        <Field label="タイトル">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="要約">
          <input className={inputClass} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </Field>
        <Field label="本文（空行区切りで段落）">
          <textarea className={inputClass} rows={8} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
        </Field>
        <Field label="メルカリ検索キーワード（具体的な商品名。カテゴリ名のみ不可）">
          <input className={inputClass} value={mercariSearchQuery} onChange={(e) => setMercariSearchQuery(e.target.value)} />
        </Field>
        <Field label="タグ（カンマ区切り）">
          <input className={inputClass} value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        </Field>
        <Field label="カバー画像の代替テキスト（任意）">
          <input className={inputClass} value={coverImageAlt} onChange={(e) => setCoverImageAlt(e.target.value)} />
        </Field>
        <Field label="カバー画像（必須・1枚目のカット）">
          <input
            type="file"
            accept="image/*"
            className="text-xs"
            onChange={(e) => setCoverImageFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="追加の画像（カルーセルの残りカット。複数選択可）">
          <input
            type="file"
            accept="image/*"
            multiple
            className="text-xs"
            onChange={(e) => setGalleryFiles(Array.from(e.target.files ?? []))}
          />
        </Field>

        {publishError && <p className="text-sm text-destructive">{publishError}</p>}
        {result && (
          <p className="text-sm text-emerald-700">
            {result.merged ? "本日の既存記事に追記しました: " : "新規記事として公開しました: "}
            <a href={`/articles/${result.slug}`} target="_blank" rel="noopener noreferrer" className="underline">
              /articles/{result.slug}
            </a>
          </p>
        )}

        <button
          type="button"
          onClick={publish}
          disabled={publishing || !title.trim() || !excerpt.trim() || !bodyText.trim() || !coverImageFile}
          className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {publishing ? "公開中..." : "公開する"}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  )
}
