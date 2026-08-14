"use client"

import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from "react"

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"

const SHOPS = [
  { key: "tonari", label: "tonari(祐天寺)" },
  { key: "ROOM", label: "ROOM(三軒茶屋)" },
]

/** クリップボードに乗っている画像(Instagramで「画像をコピー」した場合など)をFileの配列として取り出す */
function imagesFromClipboard(e: ClipboardEvent): File[] {
  const items = Array.from(e.clipboardData?.items ?? [])
  return items
    .filter((item) => item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((f): f is File => f !== null)
}

/** 画像プレビュー用のobject URL。fileが変わるたびに古いURLを解放する */
function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return url
}

/**
 * クラウド自動化ルーティンがInstagramへ到達できない(egressプロキシでブロック、2026-08-12確認)ため、
 * 人間がInstagramを見てURL+キャプション+写真を貼る半自動フローに切り替えた画面。
 * AIはキャプション本文から下書き文章を提案するのみで、画像の取得・公開の最終判断は必ず人間が行う。
 * 画像はInstagramの署名URLを直リンクせず必ず自己ホストする(既存の画像方針を踏襲)ため、
 * ファイル選択に加えて「Instagramで画像をコピー→ここに貼り付け」でも取り込めるようにしてある。
 *
 * 複数の投稿を1画面でまとめて扱えるよう、投稿ごとにカードを追加できる(「+ 別の投稿を追加」)。
 * 各カードは独立して「AI下書き生成」「公開する」を実行する——1クリックで全件まとめて送信する
 * ような一括処理はあえて作っていない(同一ファイルへの連続書き込みでデータが消える既知のBlob
 * 競合バグがあるため)。同じ日・同じショップの投稿は、publishShopUpdate側の既存ロジックにより
 * サーバー側で自動的に1つの記事へ統合される(1件ずつ、公開が完了してから次を送る運用なら安全)。
 */
export function VintageShopPublisher() {
  const nextId = useRef(1)
  const [entryIds, setEntryIds] = useState<number[]>([0])

  function addEntry() {
    setEntryIds((prev) => [...prev, nextId.current++])
  }
  function removeEntry(id: number) {
    setEntryIds((prev) => prev.filter((x) => x !== id))
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground leading-relaxed">
        新着投稿が複数あれば「+ 別の投稿を追加」でカードを増やせます。同じ日・同じショップの投稿は公開時に自動で1つの記事へまとめられるので、投稿ごとに1枚ずつ、順番に「公開する」を押してください(まとめて一括送信はできません)。
      </p>
      {entryIds.map((id, i) => (
        <PostEntryCard key={id} index={i} onRemove={() => removeEntry(id)} removable={entryIds.length > 1} />
      ))}
      <button
        type="button"
        onClick={addEntry}
        className="h-9 rounded-full border border-border px-4 text-xs font-semibold hover:bg-secondary"
      >
        + 別の投稿を追加
      </button>
    </div>
  )
}

function PostEntryCard({ index, onRemove, removable }: { index: number; onRemove: () => void; removable: boolean }) {
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

  const coverPreviewUrl = useObjectUrl(coverImageFile)

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
      setPublishError("カバー画像を選択・貼り付けしてください")
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
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "公開に失敗しました")
    } finally {
      setPublishing(false)
    }
  }

  const published = !!result

  return (
    <div className={`rounded-xl border p-4 ${published ? "border-emerald-300 bg-emerald-50/40" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-muted-foreground">投稿 {index + 1}</p>
        {removable && !published && (
          <button type="button" onClick={onRemove} className="text-xs text-muted-foreground hover:text-destructive">
            このカードを削除
          </button>
        )}
      </div>

      <fieldset disabled={published} className="space-y-4 disabled:opacity-60">
        <div className="rounded-lg border border-border bg-background/50 p-3">
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

        <FieldGroup label="カバー画像（必須・1枚目のカット）">
          <div className="grid grid-cols-2 gap-2">
            <PasteZone
              onPasteImages={(imgs) => {
                if (imgs[0]) setCoverImageFile(imgs[0])
              }}
            />
            <FilePickerButton
              text="📁 ファイルを選択"
              onFiles={(files) => setCoverImageFile(files[0] ?? null)}
            />
          </div>
          {coverPreviewUrl && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverPreviewUrl} alt="" className="h-14 w-14 rounded-md object-cover border border-border" />
              設定済み
            </div>
          )}
        </FieldGroup>

        <FieldGroup label="追加の画像（カルーセルの残りカット。複数選択可・貼り付けも複数回できます）">
          <div className="grid grid-cols-2 gap-2">
            <PasteZone
              hint="1枚ずつ繰り返し貼り付け可"
              onPasteImages={(imgs) => {
                if (imgs.length > 0) setGalleryFiles((prev) => [...prev, ...imgs])
              }}
            />
            <FilePickerButton
              text="📁 ファイルを選択(複数可)"
              multiple
              onFiles={(files) => setGalleryFiles((prev) => [...prev, ...files])}
            />
          </div>
          {galleryFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {galleryFiles.map((f, i) => (
                <GalleryThumb key={i} file={f} onRemove={() => setGalleryFiles((prev) => prev.filter((_, idx) => idx !== i))} />
              ))}
            </div>
          )}
        </FieldGroup>
      </fieldset>

      {publishError && <p className="mt-3 text-sm text-destructive">{publishError}</p>}
      {result && (
        <p className="mt-3 text-sm text-emerald-700">
          {result.merged ? "本日の既存記事に追記しました: " : "新規記事として公開しました: "}
          <a href={`/articles/${result.slug}`} target="_blank" rel="noopener noreferrer" className="underline">
            /articles/{result.slug}
          </a>
        </p>
      )}

      {!published && (
        <button
          type="button"
          onClick={publish}
          disabled={publishing || !title.trim() || !excerpt.trim() || !bodyText.trim() || !coverImageFile}
          className="mt-4 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {publishing ? "公開中..." : "公開する"}
        </button>
      )}
    </div>
  )
}

/**
 * ファイル選択ボタンとは別に独立させた貼り付け専用エリア。同じ枠内に重ねると
 * クリックが常にファイル選択側に奪われてしまう(実際に報告のあった不具合)ため、
 * この要素はクリックでは何も起きず、フォーカスした状態でCtrl+V/Cmd+Vを押すことだけを想定している。
 * Safariはボタンでないただのdivをクリックしただけではキーボードフォーカスを移さないため、
 * onClickで明示的にfocus()を呼ぶ(呼ばないとクリック後にCtrl+Vを押しても何も起きない)。
 * フォーカスできているかどうかを見た目でも分かるよう、フォーカス中は文言を変える。
 */
function PasteZone({ onPasteImages, hint }: { onPasteImages: (files: File[]) => void; hint?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <div
      tabIndex={0}
      onClick={(e) => e.currentTarget.focus()}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPaste={(e) => onPasteImages(imagesFromClipboard(e))}
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-center text-xs outline-none cursor-pointer ${
        focused ? "border-solid border-ring bg-secondary ring-2 ring-ring text-foreground" : "border-dashed border-border text-muted-foreground"
      }`}
    >
      <span>{focused ? "✅ 準備OK・貼り付けてください" : "📋 クリックして貼り付け"}</span>
      <span className="text-[10px] text-muted-foreground/70">
        {focused ? "Ctrl+V / Cmd+V" : `(Instagramで画像をコピー→Ctrl+V / Cmd+V${hint ? `・${hint}` : ""})`}
      </span>
    </div>
  )
}

/**
 * 貼り付け欄とは別の、単独のファイル選択ボタン。この`<label>`にはinput以外の
 * 要素を絶対に入れない——labelはクリックされた位置に関わらず内部の最初のフォーム
 * 部品を発火させる仕様なので、隣のPasteZoneと同じlabel/親labelに同居させると
 * 貼り付け欄をクリックしただけでファイル選択が開いてしまう(実際に起きた不具合)。
 */
function FilePickerButton({ text, multiple, onFiles }: { text: string; multiple?: boolean; onFiles: (files: File[]) => void }) {
  return (
    <label className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border p-3 text-xs text-muted-foreground cursor-pointer hover:bg-secondary">
      <span>{text}</span>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(e) => onFiles(Array.from(e.target.files ?? []))}
      />
    </label>
  )
}

function GalleryThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useObjectUrl(file)
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="h-14 w-14 rounded-md object-cover border border-border" />}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground"
        aria-label="削除"
      >
        ×
      </button>
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

/**
 * Fieldの`<label>`版と違い、中に複数の独立したフォーム部品(貼り付け欄+ファイル選択等)を
 * 入れる箇所専用。`<label>`にしないのは、labelの「内部の最初のフォーム部品を暗黙に指す」
 * 仕様により、無関係な部品(貼り付け欄)のクリックまでファイル選択に奪われてしまうため。
 */
function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="block text-xs font-semibold mb-1.5">{label}</p>
      {children}
    </div>
  )
}
