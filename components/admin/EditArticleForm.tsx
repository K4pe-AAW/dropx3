"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { Article, Category, AffiliateLink, GalleryImage, OfficialLink, ColorwayInfo, PurchaseChannelInfo } from "@/lib/types"

type ColorwayDraft = ColorwayInfo & { retailersText: string }

function toColorwayDraft(cw: ColorwayInfo): ColorwayDraft {
  return { ...cw, retailersText: (cw.retailers ?? []).join(", ") }
}
import { siteConfig } from "@/lib/site-config"

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"

export function EditArticleForm({ article }: { article: Article }) {
  const router = useRouter()
  const [title, setTitle] = useState(article.title)
  const [excerpt, setExcerpt] = useState(article.excerpt)
  const [bodyText, setBodyText] = useState(article.bodyParagraphs.join("\n\n"))
  const [category, setCategory] = useState<Category>(article.category)
  const [brandsText, setBrandsText] = useState(article.brands.join(", "))
  const [tagsText, setTagsText] = useState(article.tags.join(", "))
  const [coverImage, setCoverImage] = useState(article.coverImage)
  const [coverImageAlt, setCoverImageAlt] = useState(article.coverImageAlt)
  const [featured, setFeatured] = useState(article.featured)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(article.galleryImages)
  const [colorways, setColorways] = useState<ColorwayDraft[]>((article.colorways ?? []).map(toColorwayDraft))
  const [purchaseChannels, setPurchaseChannels] = useState<PurchaseChannelInfo[]>(article.purchaseChannels ?? [])
  const [officialLinks, setOfficialLinks] = useState<OfficialLink[]>(article.officialLinks)
  const [links, setLinks] = useState<(AffiliateLink & { price?: string })[]>(
    article.affiliateLinks.length > 0 ? article.affiliateLinks : [{ label: "", retailer: "", url: "", price: "" }]
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)

  function updateGalleryImage(i: number, patch: Partial<GalleryImage>) {
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
  function updatePurchaseChannel(i: number, patch: Partial<PurchaseChannelInfo>) {
    setPurchaseChannels((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }
  function removePurchaseChannel(i: number) {
    setPurchaseChannels((prev) => prev.filter((_, idx) => idx !== i))
  }
  function updateOfficialLink(i: number, patch: Partial<OfficialLink>) {
    setOfficialLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function removeOfficialLink(i: number) {
    setOfficialLinks((prev) => prev.filter((_, idx) => idx !== i))
  }
  function updateLink(i: number, patch: Partial<AffiliateLink & { price?: string }>) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSaved(false)

    const affiliateLinks = links
      .filter((l) => l.url.trim())
      .map((l) => ({
        label: l.label.trim() || "商品を見る",
        retailer: l.retailer.trim(),
        url: l.url.trim(),
        ...(l.price?.trim() ? { price: l.price.trim() } : {}),
      }))

    const res = await fetch(`/api/admin/articles/${article.id}`, {
      method: "PUT",
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
            ...(c.image?.trim() ? { image: c.image.trim() } : {}),
            ...(c.styleCode?.trim() ? { styleCode: c.styleCode.trim() } : {}),
            ...(c.price?.trim() ? { price: c.price.trim() } : {}),
            ...(c.size?.trim() ? { size: c.size.trim() } : {}),
            ...(c.releaseDate?.trim() ? { releaseDate: c.releaseDate.trim() } : {}),
            ...(c.retailersText.trim()
              ? { retailers: c.retailersText.split(",").map((r) => r.trim()).filter(Boolean) }
              : {}),
          })),
        purchaseChannels: purchaseChannels.filter((c) => c.retailerName.trim()),
      }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "保存に失敗しました")
      return
    }

    setSaved(true)
    router.refresh()
  }

  async function handleUnpublish() {
    if (!confirm("この記事を非公開にしますか？(内容は下書き一覧に「却下」状態で残ります。公開ページからは見えなくなります)")) return
    setUnpublishing(true)
    setError(null)
    const res = await fetch(`/api/admin/articles/${article.id}`, { method: "DELETE" })
    setUnpublishing(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "非公開化に失敗しました")
      return
    }
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
        <textarea className={inputClass} rows={10} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="カテゴリー">
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
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
          placeholder="https://... または /images/..."
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
                value={cw.image ?? ""}
                onChange={(e) => updateColorway(i, { image: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="スタイルコード（任意）"
                value={cw.styleCode ?? ""}
                onChange={(e) => updateColorway(i, { styleCode: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="販売価格（例: 38,500円（税込））"
                value={cw.price ?? ""}
                onChange={(e) => updateColorway(i, { price: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="サイズ（例: JP24.0 – JP29）"
                value={cw.size ?? ""}
                onChange={(e) => updateColorway(i, { size: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="発売予定日（例: 2026年8月7日）"
                value={cw.releaseDate ?? ""}
                onChange={(e) => updateColorway(i, { releaseDate: e.target.value })}
              />
              <input
                className={`${inputClass} col-span-2`}
                placeholder="取扱店（カンマ区切り、例: HOKA公式サイト, mita sneakers）"
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
            setColorways((prev) => [...prev, { colorName: "", retailersText: "" }])
          }
          className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
        >
          + カラーを追加
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2">抽選情報・販売方法（任意・店舗ごとの抽選/通常販売と日程）</p>
        <div className="space-y-3">
          {purchaseChannels.map((c, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
              <input
                className={inputClass}
                placeholder="店舗名（例: mita sneakers）"
                value={c.retailerName}
                onChange={(e) => updatePurchaseChannel(i, { retailerName: e.target.value })}
              />
              <select
                className={inputClass}
                value={c.channelType}
                onChange={(e) => updatePurchaseChannel(i, { channelType: e.target.value as PurchaseChannelInfo["channelType"] })}
              >
                <option value="official">公式・正規販売店</option>
                <option value="secondary">セレクト店・二次流通</option>
              </select>
              <select
                className={inputClass}
                value={c.saleMethod}
                onChange={(e) => updatePurchaseChannel(i, { saleMethod: e.target.value as PurchaseChannelInfo["saleMethod"] })}
              >
                <option value="regular">通常販売</option>
                <option value="lottery">抽選</option>
                <option value="unknown">販売方法未確認</option>
              </select>
              <input
                className={inputClass}
                placeholder="日程（例: 9月1日〜9月7日 応募）"
                value={c.date ?? ""}
                onChange={(e) => updatePurchaseChannel(i, { date: e.target.value })}
              />
              <input
                className={`${inputClass} col-span-2`}
                placeholder="店舗URL（任意）"
                value={c.url ?? ""}
                onChange={(e) => updatePurchaseChannel(i, { url: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removePurchaseChannel(i)}
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
            setPurchaseChannels((prev) => [...prev, { retailerName: "", channelType: "official", saleMethod: "unknown" }])
          }
          className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
        >
          + 店舗を追加
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2">公式サイトへのリンク（非広告・任意）</p>
        <div className="space-y-3">
          {officialLinks.map((link, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
              <input
                className={inputClass}
                placeholder="ボタン文言"
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

      <div>
        <p className="text-xs font-semibold mb-2">アフィリエイトリンク</p>
        <div className="space-y-3">
          {links.map((link, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
              <input
                className={inputClass}
                placeholder="ボタン文言"
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
                value={link.price ?? ""}
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

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-accent-foreground">保存しました。</p>}

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          type="submit"
          disabled={submitting}
          className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? "保存中..." : "保存する"}
        </button>
        <button
          type="button"
          onClick={handleUnpublish}
          disabled={unpublishing}
          className="h-11 px-6 rounded-full border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {unpublishing ? "処理中..." : "非公開にする"}
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
