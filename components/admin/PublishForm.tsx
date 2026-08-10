"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { Draft, Category } from "@/lib/types"
import { siteConfig } from "@/lib/site-config"

type LinkDraft = { label: string; retailer: string; url: string; price: string }
type GalleryImageDraft = { url: string; alt: string }
type OfficialLinkDraft = { label: string; url: string }
type ColorwayDraft = {
  colorName: string
  image: string
  styleCode: string
  price: string
  size: string
  releaseDate: string
  retailersText: string
}

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"

export function PublishForm({ draft }: { draft: Draft }) {
  const router = useRouter()
  const [title, setTitle] = useState(draft.title)
  const [excerpt, setExcerpt] = useState(draft.excerpt)
  const [bodyText, setBodyText] = useState(draft.bodyParagraphs.join("\n\n"))
  const [category, setCategory] = useState<Category>(draft.category)
  const [brandsText, setBrandsText] = useState(draft.brands.join(", "))
  const [tagsText, setTagsText] = useState(draft.tags.join(", "))
  const [coverImage, setCoverImage] = useState("")
  const [coverImageAlt, setCoverImageAlt] = useState(draft.title)
  const [featured, setFeatured] = useState(false)
  const [links, setLinks] = useState<LinkDraft[]>([{ label: "", retailer: "", url: "", price: "" }])
  const [galleryImages, setGalleryImages] = useState<GalleryImageDraft[]>([])
  const [officialLinks, setOfficialLinks] = useState<OfficialLinkDraft[]>([])
  const [colorways, setColorways] = useState<ColorwayDraft[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateLink(i: number, patch: Partial<LinkDraft>) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function updateGalleryImage(i: number, patch: Partial<GalleryImageDraft>) {
    setGalleryImages((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)))
  }

  function removeGalleryImage(i: number) {
    setGalleryImages((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateColorway(i: number, patch: Partial<ColorwayDraft>) {
    setColorways((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }
  function removeColorway(i: number) {
    setColorways((prev) => prev.filter((_, idx) => idx !== i))
  }
  function updateOfficialLink(i: number, patch: Partial<OfficialLinkDraft>) {
    setOfficialLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function removeOfficialLink(i: number) {
    setOfficialLinks((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const affiliateLinks = links
      .filter((l) => l.url.trim())
      .map((l) => ({
        label: l.label.trim() || "商品を見る",
        retailer: l.retailer.trim(),
        url: l.url.trim(),
        ...(l.price.trim() ? { price: l.price.trim() } : {}),
      }))

    const res = await fetch(`/api/drafts/${draft.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        excerpt,
        bodyParagraphs: bodyText
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean),
        category,
        brands: brandsText.split(",").map((b) => b.trim()).filter(Boolean),
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
        coverImage,
        coverImageAlt,
        featured,
        affiliateLinks,
        galleryImages: galleryImages.filter((g) => g.url.trim()),
        officialLinks: officialLinks.filter((l) => l.url.trim()),
        colorways: colorways
          .filter((c) => c.colorName.trim())
          .map((c) => ({
            colorName: c.colorName.trim(),
            ...(c.image.trim() ? { image: c.image.trim() } : {}),
            ...(c.styleCode.trim() ? { styleCode: c.styleCode.trim() } : {}),
            ...(c.price.trim() ? { price: c.price.trim() } : {}),
            ...(c.size.trim() ? { size: c.size.trim() } : {}),
            ...(c.releaseDate.trim() ? { releaseDate: c.releaseDate.trim() } : {}),
            ...(c.retailersText.trim()
              ? { retailers: c.retailersText.split(",").map((r) => r.trim()).filter(Boolean) }
              : {}),
          })),
      }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "公開に失敗しました")
      return
    }

    router.push("/admin")
    router.refresh()
  }

  async function handleReject() {
    if (!confirm("この下書きを却下しますか？")) return
    await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" })
    router.push("/admin")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="タイトル">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <Field label="要約">
        <input className={inputClass} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      </Field>

      <Field label="本文（空行区切りで段落）">
        <textarea className={inputClass} rows={8} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="カテゴリー">
          <select
            className={inputClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {siteConfig.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="おすすめ記事">
          <label className="flex items-center gap-2 h-10 text-sm">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            featuredにする
          </label>
        </Field>
      </div>

      <Field label="ブランド（カンマ区切り）">
        <input className={inputClass} value={brandsText} onChange={(e) => setBrandsText(e.target.value)} />
      </Field>

      <Field label="タグ（カンマ区切り）">
        <input className={inputClass} value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
      </Field>

      <Field label="カバー画像URL（必須）">
        <input
          className={inputClass}
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="https://..."
          required
        />
      </Field>

      <Field label="画像の代替テキスト">
        <input className={inputClass} value={coverImageAlt} onChange={(e) => setCoverImageAlt(e.target.value)} />
      </Field>

      <div>
        <p className="text-xs font-semibold mb-2">追加の画像（記事内にギャラリー表示・任意）</p>
        <div className="space-y-3">
          {galleryImages.map((img, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
              <input
                className={`${inputClass} col-span-2`}
                placeholder="画像URL（https://... または /images/...）"
                value={img.url}
                onChange={(e) => updateGalleryImage(i, { url: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="代替テキスト"
                value={img.alt}
                onChange={(e) => updateGalleryImage(i, { alt: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeGalleryImage(i)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                削除
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setGalleryImages((prev) => [...prev, { url: "", alt: "" }])}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
        >
          + 画像を追加
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2">カラーバリエーション（任意・色ごとの型番/価格/サイズ/発売日）</p>
        <div className="space-y-3">
          {colorways.map((cw, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
              <input
                className={inputClass}
                placeholder="カラー名（例: Black/Black）"
                value={cw.colorName}
                onChange={(e) => updateColorway(i, { colorName: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="画像URL（任意）"
                value={cw.image}
                onChange={(e) => updateColorway(i, { image: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="スタイルコード（任意）"
                value={cw.styleCode}
                onChange={(e) => updateColorway(i, { styleCode: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="販売価格（例: 38,500円（税込））"
                value={cw.price}
                onChange={(e) => updateColorway(i, { price: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="サイズ（例: JP24.0 – JP29）"
                value={cw.size}
                onChange={(e) => updateColorway(i, { size: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="発売予定日（例: 2026年8月7日）"
                value={cw.releaseDate}
                onChange={(e) => updateColorway(i, { releaseDate: e.target.value })}
              />
              <input
                className={`${inputClass} col-span-2`}
                placeholder="取扱店（カンマ区切り）"
                value={cw.retailersText}
                onChange={(e) => updateColorway(i, { retailersText: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeColorway(i)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                削除
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setColorways((prev) => [
              ...prev,
              { colorName: "", image: "", styleCode: "", price: "", size: "", releaseDate: "", retailersText: "" },
            ])
          }
          className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
        >
          + カラーを追加
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2">公式サイトへのリンク（非広告・任意）</p>
        <p className="text-[11px] text-muted-foreground mb-2">
          紹介料が発生しないブランド/店舗公式サイトへの直リンク。「PR」表記は付かない。
        </p>
        <div className="space-y-3">
          {officialLinks.map((link, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
              <input
                className={inputClass}
                placeholder="ボタン文言（例: AURALEE公式サイトで見る）"
                value={link.label}
                onChange={(e) => updateOfficialLink(i, { label: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="URL"
                value={link.url}
                onChange={(e) => updateOfficialLink(i, { url: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeOfficialLink(i)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                削除
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOfficialLinks((prev) => [...prev, { label: "", url: "" }])}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
        >
          + リンクを追加
        </button>
      </div>

      {draft.suggestedAffiliateSearch.length > 0 && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          AIが提案した検索キーワード（A8.net/バリューコマースの管理画面でこれらの商品を検索し、
          発行されたリンクを下に貼ってください）：{draft.suggestedAffiliateSearch.join(" / ")}
        </p>
      )}

      <div>
        <p className="text-xs font-semibold mb-2">アフィリエイトリンク</p>
        <div className="space-y-3">
          {links.map((link, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
              <input
                className={inputClass}
                placeholder="ボタン文言（例: ZOZOTOWNで見る）"
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          type="submit"
          disabled={submitting}
          className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? "公開中..." : "公開する"}
        </button>
        <button
          type="button"
          onClick={handleReject}
          className="h-11 px-6 rounded-full border border-border text-sm font-semibold hover:bg-secondary"
        >
          却下する
        </button>
      </div>
    </form>
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
