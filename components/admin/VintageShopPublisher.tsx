"use client"

import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from "react"
import { QUICK_AFFILIATE_RETAILERS } from "@/lib/affiliate"

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"

type LinkDraft = { label: string; retailer: string; url: string; price: string }

const SHOPS = [
  { key: "tonari", label: "tonari(祐天寺)" },
  { key: "ROOM", label: "ROOM(三軒茶屋)" },
]

function shopLabel(key: string): string {
  return SHOPS.find((s) => s.key === key)?.label ?? key
}

/** クリップボードに乗っている画像(Instagramで「画像をコピー」した場合など)をFileの配列として取り出す */
function imagesFromClipboard(e: ClipboardEvent): File[] {
  const items = Array.from(e.clipboardData?.items ?? [])
  return items
    .filter((item) => item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((f): f is File => f !== null)
}

const MAX_IMAGE_DIMENSION = 1600
const IMAGE_QUALITY = 0.82

/**
 * 貼り付け・選択した画像を記事用サイズに圧縮する。無圧縮のスクリーンショット等を
 * 複数枚まとめて送るとVercelのリクエストサイズ上限(約4.5MB)を超えて公開APIが
 * 失敗する(実際に発生した不具合、"Request Entity Too Large"がJSONでなく返り
 * クライアント側でJSON.parseエラーになる)。記事の表示に元解像度は不要なので、
 * 長辺1600px・JPEG品質82%に揃えてから送る。
 */
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", IMAGE_QUALITY))
  if (!blob || blob.size >= file.size) return file

  const name = file.name.replace(/\.[^.]+$/, "") || "image"
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" })
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

/** サーバーからのレスポンスをJSONとして読む。413等プラットフォームのプレーンテキストエラーにも対応する */
async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const raw = await res.text()
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(
      res.status === 413 || /entity too large/i.test(raw)
        ? "画像の合計サイズが大きすぎます(自動圧縮後もこの状態なら、画像の枚数を減らして分けて送ってください)"
        : `サーバーエラー(${res.status}): ${raw.slice(0, 100)}`
    )
  }
}

type ViewTab = "compose" | "drafts" | "published"

/**
 * クラウド自動化ルーティンがInstagramへ到達できない(egressプロキシでブロック、2026-08-12確認)ため、
 * 人間がInstagramを見てURL+キャプション+写真を貼る半自動フローに切り替えた画面。
 * AIはキャプション本文から下書き文章を提案するのみで、画像の取得・公開の最終判断は必ず人間が行う。
 * 画像はInstagramの署名URLを直リンクせず必ず自己ホストする(既存の画像方針を踏襲)ため、
 * ファイル選択に加えて「Instagramで画像をコピー→ここに貼り付け」でも取り込めるようにしてある。
 *
 * 新規投稿(作成中)・下書き(保存済み・未公開)・投稿済みの3つを切り替えられる構成にしてある。
 * 複数の投稿を1画面でまとめて扱えるよう、新規投稿タブでは投稿ごとにカードを追加できる
 * (「+ 別の投稿を追加」)。各カードは独立して「AI下書き生成」「公開する」「下書き保存」を
 * 実行する——1クリックで全件まとめて送信するような一括処理はあえて作っていない
 * (同一ファイルへの連続書き込みでデータが消える既知のBlob競合バグがあるため)。
 * 同じ日・同じショップの投稿は、publishShopUpdate側の既存ロジックによりサーバー側で
 * 自動的に1つの記事へ統合される(1件ずつ、公開が完了してから次を送る運用なら安全)。
 */
export function VintageShopPublisher() {
  const [view, setView] = useState<ViewTab>("compose")
  const nextId = useRef(1)
  const [entryIds, setEntryIds] = useState<number[]>([0])
  const [draftsRefreshKey, setDraftsRefreshKey] = useState(0)

  function addEntry() {
    setEntryIds((prev) => [...prev, nextId.current++])
  }
  function removeEntry(id: number) {
    setEntryIds((prev) => prev.filter((x) => x !== id))
  }

  const tabs: { key: ViewTab; label: string }[] = [
    { key: "compose", label: "新規投稿" },
    { key: "drafts", label: "下書き" },
    { key: "published", label: "投稿済み" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-full bg-secondary p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setView(t.key)}
            className={`h-8 rounded-full px-4 text-xs font-semibold ${
              view === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === "compose" && (
        <div className="space-y-8">
          <p className="text-xs text-muted-foreground leading-relaxed">
            新着投稿が複数あれば「+ 別の投稿を追加」でカードを増やせます。同じ日・同じショップの投稿は公開時に自動で1つの記事へまとめられるので、投稿ごとに1枚ずつ、順番に「公開する」を押してください(まとめて一括送信はできません)。まだ確定できない場合は「下書き保存」で一旦保存できます。
          </p>
          {entryIds.map((id, i) => (
            <PostEntryCard
              key={id}
              index={i}
              onRemove={() => removeEntry(id)}
              removable={entryIds.length > 1}
              onSavedAsDraft={() => setDraftsRefreshKey((k) => k + 1)}
            />
          ))}
          <button
            type="button"
            onClick={addEntry}
            className="h-9 rounded-full border border-border px-4 text-xs font-semibold hover:bg-secondary"
          >
            + 別の投稿を追加
          </button>
        </div>
      )}

      {view === "drafts" && <DraftsTab refreshKey={draftsRefreshKey} />}
      {view === "published" && <PublishedTab />}
    </div>
  )
}

function PostEntryCard({
  index,
  onRemove,
  removable,
  onSavedAsDraft,
}: {
  index: number
  onRemove: () => void
  removable: boolean
  onSavedAsDraft: () => void
}) {
  const [shop, setShop] = useState(SHOPS[0].key)
  const [postUrl, setPostUrl] = useState("")
  const [caption, setCaption] = useState("")
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [autoLinkQuery, setAutoLinkQuery] = useState("")
  const [links, setLinks] = useState<LinkDraft[]>([])
  const [tagsText, setTagsText] = useState("古着")
  const [coverImageAlt, setCoverImageAlt] = useState("")
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])

  const [submitting, setSubmitting] = useState<"publish" | "draft" | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<
    { type: "published"; merged: boolean; slug: string; id: string } | { type: "draft" } | null
  >(null)

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
      setAutoLinkQuery(data.suggestedAffiliateQuery)
      setTagsText((data.tags as string[]).join(", "))
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "下書き生成に失敗しました")
    } finally {
      setDrafting(false)
    }
  }

  function updateLink(i: number, patch: Partial<LinkDraft>) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i))
  }

  /** 商品名を1回入力するだけで、自動生成できる店舗(メルカリ・Yahoo!ショッピング等)のリンクをまとめて追加する */
  function addAutoLinks() {
    const query = autoLinkQuery.trim()
    if (!query) {
      window.alert("商品名やキーワードを入力してください（例: HELMUT LANG デニムショーツ）")
      return
    }
    const added: LinkDraft[] = []
    const failed: string[] = []
    for (const item of QUICK_AFFILIATE_RETAILERS) {
      if (!item.build) continue
      try {
        const link = item.build(query)
        added.push({ label: link.label, retailer: link.retailer, url: link.url, price: "" })
      } catch {
        failed.push(item.retailer)
      }
    }
    if (added.length > 0) {
      setLinks((prev) => [...prev, ...added])
    }
    if (failed.length > 0) {
      window.alert(`${failed.join("・")}のリンクは作成できませんでした（キーワードが具体的か確認してください）`)
    }
  }

  function addManualLink(item: (typeof QUICK_AFFILIATE_RETAILERS)[number]) {
    setLinks((prev) => [...prev, { label: item.label, retailer: item.retailer, url: "", price: "" }])
  }

  function buildFormData(): FormData {
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
    fd.set(
      "affiliateLinks",
      JSON.stringify(
        links
          .filter((l) => l.url.trim())
          .map((l) => ({
            label: l.label.trim() || "商品を見る",
            retailer: l.retailer.trim(),
            url: l.url.trim(),
            ...(l.price.trim() ? { price: l.price.trim() } : {}),
          }))
      )
    )
    fd.set("coverImageAlt", coverImageAlt.trim())
    fd.set("coverImage", coverImageFile as File)
    for (const f of galleryFiles) fd.append("galleryImages", f)
    return fd
  }

  async function publish() {
    if (!coverImageFile) {
      setSubmitError("カバー画像を選択・貼り付けしてください")
      return
    }
    setSubmitting("publish")
    setSubmitError(null)
    setOutcome(null)
    try {
      const res = await fetch("/api/admin/vintage-shop/publish", { method: "POST", body: buildFormData() })
      const data = await readJsonResponse(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "公開に失敗しました")
      setOutcome({ type: "published", merged: !!data.merged, slug: (data.slug as string) ?? "", id: (data.id as string) ?? "" })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "公開に失敗しました")
    } finally {
      setSubmitting(null)
    }
  }

  async function saveDraft() {
    if (!coverImageFile) {
      setSubmitError("カバー画像を選択・貼り付けしてください")
      return
    }
    setSubmitting("draft")
    setSubmitError(null)
    setOutcome(null)
    try {
      const res = await fetch("/api/admin/vintage-shop/drafts", { method: "POST", body: buildFormData() })
      const data = await readJsonResponse(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "下書き保存に失敗しました")
      setOutcome({ type: "draft" })
      onSavedAsDraft()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "下書き保存に失敗しました")
    } finally {
      setSubmitting(null)
    }
  }

  async function handleCoverFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setCoverImageFile(await compressImage(f))
  }

  async function handleGalleryFiles(files: File[]) {
    if (files.length === 0) return
    const compressed = await Promise.all(files.map(compressImage))
    setGalleryFiles((prev) => [...prev, ...compressed])
  }

  const locked = !!outcome

  return (
    <div className={`rounded-xl border p-4 ${locked ? "border-emerald-300 bg-emerald-50/40" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-muted-foreground">投稿 {index + 1}</p>
        {removable && !locked && (
          <button type="button" onClick={onRemove} className="text-xs text-muted-foreground hover:text-destructive">
            このカードを削除
          </button>
        )}
      </div>

      <fieldset disabled={locked} className="space-y-4 disabled:opacity-60">
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
        <div>
          <p className="text-xs font-semibold mb-1.5">アフィリエイトリンク（複数可）</p>

          <div className="flex flex-wrap gap-2 mb-1.5">
            <input
              className={`${inputClass} flex-1 min-w-[220px]`}
              placeholder="商品名・型番を入力（例: HELMUT LANG デニムショーツ）"
              value={autoLinkQuery}
              onChange={(e) => setAutoLinkQuery(e.target.value)}
            />
            <button
              type="button"
              onClick={addAutoLinks}
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:opacity-90"
            >
              自動でリンクを追加
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            {QUICK_AFFILIATE_RETAILERS.filter((item) => item.build)
              .map((item) => item.retailer)
              .join("・")}
            の検索リンクを、このキーワードでまとめて追加します。
          </p>

          <div className="flex flex-wrap gap-2 mb-1.5">
            {QUICK_AFFILIATE_RETAILERS.filter((item) => !item.build).map((item) => (
              <button
                key={item.retailer}
                type="button"
                onClick={() => addManualLink(item)}
                className="h-8 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"
              >
                + {item.retailer}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            上のボタンは文言・店舗名だけ自動入力します。URLはA8.net/バリューコマースの管理画面で発行してコピペしてください。
          </p>

          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-2">
                <input
                  className={inputClass}
                  placeholder="ボタン文言（例: メルカリで見る）"
                  value={link.label}
                  onChange={(e) => updateLink(i, { label: e.target.value })}
                />
                <input
                  className={inputClass}
                  placeholder="販売店名"
                  value={link.retailer}
                  onChange={(e) => updateLink(i, { retailer: e.target.value })}
                />
                <input
                  className={`${inputClass} col-span-2`}
                  placeholder="アフィリエイトURL"
                  value={link.url}
                  onChange={(e) => updateLink(i, { url: e.target.value })}
                />
                <input
                  className={inputClass}
                  placeholder="価格（任意）"
                  value={link.price}
                  onChange={(e) => updateLink(i, { price: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setLinks((prev) => [...prev, { label: "", retailer: "", url: "", price: "" }])}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
          >
            + リンクを追加
          </button>
        </div>
        <Field label="タグ（カンマ区切り）">
          <input className={inputClass} value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        </Field>
        <Field label="カバー画像の代替テキスト（任意）">
          <input className={inputClass} value={coverImageAlt} onChange={(e) => setCoverImageAlt(e.target.value)} />
        </Field>

        <FieldGroup label="カバー画像（必須・1枚目のカット）">
          <div className="grid grid-cols-2 gap-2">
            <PasteZone onPasteImages={handleCoverFiles} />
            <FilePickerButton text="📁 ファイルを選択" onFiles={handleCoverFiles} />
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
            <PasteZone hint="1枚ずつ繰り返し貼り付け可" onPasteImages={handleGalleryFiles} />
            <FilePickerButton text="📁 ファイルを選択(複数可)" multiple onFiles={handleGalleryFiles} />
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

      {submitError && <p className="mt-3 text-sm text-destructive">{submitError}</p>}
      {outcome?.type === "published" && (
        <p className="mt-3 text-sm text-emerald-700">
          {outcome.merged ? "本日の既存記事に追記しました: " : "新規記事として公開しました: "}
          <a href={`/articles/${outcome.slug}`} target="_blank" rel="noopener noreferrer" className="underline">
            /articles/{outcome.slug}
          </a>
          {outcome.id && (
            <>
              {" "}
              ・
              <a href={`/admin/articles/${outcome.id}/edit`} target="_blank" rel="noopener noreferrer" className="underline">
                この記事を編集する
              </a>
            </>
          )}
        </p>
      )}
      {outcome?.type === "draft" && (
        <p className="mt-3 text-sm text-emerald-700">下書きとして保存しました。「下書き」タブから続きを編集・公開できます。</p>
      )}

      {!locked && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={publish}
            disabled={!!submitting || !title.trim() || !excerpt.trim() || !bodyText.trim() || !coverImageFile}
            className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {submitting === "publish" ? "公開中..." : "公開する"}
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={!!submitting || !title.trim() || !coverImageFile}
            className="h-11 px-6 rounded-full border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-50"
          >
            {submitting === "draft" ? "保存中..." : "下書き保存"}
          </button>
        </div>
      )}
    </div>
  )
}

type VintageDraft = {
  id: string
  shop: string
  title: string
  excerpt: string
  bodyParagraphs: string[]
  postUrl: string
  coverImage: string
  createdAt: string
}

/**
 * 保存済みの下書き一覧。「公開する」でそのまま公開、「削除」で破棄する。
 * 「本文を確認」で全文を展開表示し、あわせて元のInstagram投稿へのリンクも出す——
 * AIが本文を組み立てた元ネタ(投稿URL)をレビュー時にクリックして見比べられるようにするため。
 */
function DraftsTab({ refreshKey }: { refreshKey: number }) {
  const [drafts, setDrafts] = useState<VintageDraft[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function load() {
    setError(null)
    try {
      const res = await fetch("/api/admin/vintage-shop/drafts", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "下書きの取得に失敗しました")
      setDrafts(data.drafts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "下書きの取得に失敗しました")
    }
  }

  useEffect(() => {
    load()
  }, [refreshKey])

  async function publishDraft(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/vintage-shop/drafts/${id}/publish`, { method: "POST" })
      const data = await readJsonResponse(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "公開に失敗しました")
      setDrafts((prev) => (prev ? prev.filter((d) => d.id !== id) : prev))
      setMessages((prev) => ({ ...prev, [id]: `公開しました: /articles/${data.slug}` }))
    } catch (err) {
      setMessages((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : "公開に失敗しました" }))
    } finally {
      setBusyId(null)
    }
  }

  async function deleteDraft(id: string) {
    if (!confirm("この下書きを削除しますか？(元に戻せません)")) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/vintage-shop/drafts/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("削除に失敗しました")
      setDrafts((prev) => (prev ? prev.filter((d) => d.id !== id) : prev))
    } catch (err) {
      setMessages((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : "削除に失敗しました" }))
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (drafts === null) return <p className="text-sm text-muted-foreground">読み込み中...</p>
  if (drafts.length === 0) return <p className="text-sm text-muted-foreground">下書きはありません。</p>

  return (
    <div className="space-y-3">
      {drafts.map((d) => {
        const expanded = expandedId === d.id
        return (
          <div key={d.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.coverImage} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover border border-border" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold text-muted-foreground">{shopLabel(d.shop)}</p>
                  {d.postUrl && (
                    <a
                      href={d.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground underline hover:text-foreground"
                    >
                      元の投稿を見る ↗
                    </a>
                  )}
                </div>
                <p className="truncate text-sm font-semibold">{d.title}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(d.createdAt).toLocaleString("ja-JP")}</p>
                {messages[d.id] && <p className="text-[11px] text-emerald-700 mt-1">{messages[d.id]}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : d.id)}
                  className="h-8 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary"
                >
                  {expanded ? "本文を閉じる" : "本文を確認"}
                </button>
                <button
                  type="button"
                  onClick={() => publishDraft(d.id)}
                  disabled={busyId === d.id}
                  className="h-8 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  公開する
                </button>
                <button
                  type="button"
                  onClick={() => deleteDraft(d.id)}
                  disabled={busyId === d.id}
                  className="h-8 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                >
                  削除
                </button>
              </div>
            </div>
            {expanded && (
              <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                <p className="text-muted-foreground">{d.excerpt}</p>
                {d.bodyParagraphs.map((p, i) => (
                  <p key={i} className="leading-relaxed">
                    {p}
                  </p>
                ))}
                {d.postUrl && (
                  <a
                    href={d.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    元の投稿と照らし合わせて確認する ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

type PublishedItem = {
  id: string
  slug: string
  title: string
  coverImage: string
  brands: string[]
  publishedAt: string
}

/** 投稿済みの古着記事一覧(直近20件)。編集・閲覧へのリンクのみで、ここ自体は読み取り専用 */
function PublishedTab() {
  const [items, setItems] = useState<PublishedItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/vintage-shop/published", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setItems(data.items))
      .catch(() => setError("投稿済み記事の取得に失敗しました"))
  }, [])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (items === null) return <p className="text-sm text-muted-foreground">読み込み中...</p>
  if (items.length === 0) return <p className="text-sm text-muted-foreground">投稿済みの古着記事はまだありません。</p>

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.coverImage} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover border border-border" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground">{a.brands.map(shopLabel).join(" / ")}</p>
            <p className="truncate text-sm font-semibold">{a.title}</p>
            <p className="text-[11px] text-muted-foreground">{new Date(a.publishedAt).toLocaleDateString("ja-JP")}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <a
              href={`/articles/${a.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 rounded-full border border-border px-3 text-xs font-semibold leading-8 hover:bg-secondary"
            >
              見る
            </a>
            <a
              href={`/admin/articles/${a.id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 rounded-full bg-primary px-3 text-xs font-bold leading-8 text-primary-foreground"
            >
              編集する
            </a>
          </div>
        </div>
      ))}
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
