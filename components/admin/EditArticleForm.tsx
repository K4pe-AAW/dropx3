"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type {
  Article, ContentType,
  Category,
  AffiliateLink,
  GalleryImage,
  OfficialLink,
  OfficialProductLink,
  PurchaseChannelInfo,
  RelatedArticleLink,
  SourceRef,
} from "@/lib/types"
import { CONTENT_TYPES, inferContentType } from "@/lib/content-type"
import { siteConfig } from "@/lib/site-config"
import { QUICK_AFFILIATE_RETAILERS } from "@/lib/affiliate"

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"

export function EditArticleForm({ article }: { article: Article }) {
  const router = useRouter()
  const [title, setTitle] = useState(article.title)
  const [excerpt, setExcerpt] = useState(article.excerpt)
  const [bodyText, setBodyText] = useState(article.bodyParagraphs.join("\n\n"))
  const [category, setCategory] = useState<Category>(article.category)
  const [contentType, setContentType] = useState<ContentType>(
    article.contentType ?? inferContentType(article.category, article.affiliateLinks.length > 0)
  )
  const [brandsText, setBrandsText] = useState(article.brands.join(", "))
  const [tagsText, setTagsText] = useState(article.tags.join(", "))
  const [coverImage, setCoverImage] = useState(article.coverImage)
  const [coverImageAlt, setCoverImageAlt] = useState(article.coverImageAlt)
  const [coverImageCredit, setCoverImageCredit] = useState(article.coverImageCredit ?? "")
  const [featured, setFeatured] = useState(article.featured)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(article.galleryImages)
  const [purchaseChannels, setPurchaseChannels] = useState<PurchaseChannelInfo[]>(article.purchaseChannels ?? [])
  const [officialLinks, setOfficialLinks] = useState<OfficialLink[]>(article.officialLinks)
  const [sourceRefs, setSourceRefs] = useState<SourceRef[]>(article.sourceRefs)
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticleLink[]>(article.relatedArticles ?? [])
  const [officialProducts, setOfficialProducts] = useState<OfficialProductLink[]>(article.officialProducts ?? [])
  const [links, setLinks] = useState<(AffiliateLink & { price?: string })[]>(
    article.affiliateLinks.length > 0 ? article.affiliateLinks : [{ label: "", retailer: "", url: "", price: "" }]
  )
  const [autoLinkQuery, setAutoLinkQuery] = useState("")
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
  function updateSourceRef(i: number, patch: Partial<SourceRef>) {
    setSourceRefs((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function removeSourceRef(i: number) {
    setSourceRefs((prev) => prev.filter((_, idx) => idx !== i))
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
  function updateRelatedArticle(i: number, patch: Partial<RelatedArticleLink>) {
    setRelatedArticles((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function removeRelatedArticle(i: number) {
    setRelatedArticles((prev) => prev.filter((_, idx) => idx !== i))
  }
  function updateOfficialProduct(i: number, patch: Partial<OfficialProductLink>) {
    setOfficialProducts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  function removeOfficialProduct(i: number) {
    setOfficialProducts((prev) => prev.filter((_, idx) => idx !== i))
  }
  function updateLink(i: number, patch: Partial<AffiliateLink & { price?: string }>) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i))
  }
  /** 商品名を1回入力するだけで、自動生成できる店舗のリンクをまとめて追加する(PublishFormと同じ挙動) */
  function addAutoLinks() {
    const query = autoLinkQuery.trim()
    if (!query) {
      window.alert("商品名やキーワードを入力してください（例: Nike Air Max 90 IM9616-001）")
      return
    }
    const added: (AffiliateLink & { price?: string })[] = []
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
        contentType,
        brands: brandsText.split(",").map((b) => b.trim()).filter(Boolean),
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
        coverImage,
        coverImageAlt,
        ...(coverImageCredit.trim() ? { coverImageCredit: coverImageCredit.trim() } : {}),
        featured,
        affiliateLinks,
        galleryImages: galleryImages.filter((g) => g.url.trim()),
        officialLinks: officialLinks.filter((l) => l.url.trim()),
        sourceRefs: sourceRefs.filter((r) => r.name.trim() && r.url.trim()),
        relatedArticles: relatedArticles.filter((l) => l.title.trim() && l.slug.trim()),
        officialProducts: officialProducts
          .filter((p) => p.name.trim() && p.image.trim() && p.url.trim())
          .map((p) => ({
            name: p.name.trim(),
            image: p.image.trim(),
            url: p.url.trim(),
            ...(p.price?.trim() ? { price: p.price.trim() } : {}),
          })),
        // カラー展開はAIからしか来ない値として割り切り、手入力の編集UIは持たない
        // (2026-08-22、フォームをシンプルにする方針)。編集はできないが、既存の値をそのまま送る
        colorways: article.colorways ?? [],
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
        <Field label="記事タイプ（成果分析用）">
          <select className={inputClass} value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)}>
            {CONTENT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
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
        <div className="flex items-center gap-2">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- 貼り付けたURLの簡易プレビュー(外部ドメイン任意のため)
            <img
              key={coverImage}
              src={coverImage}
              alt=""
              className="h-12 w-12 shrink-0 rounded-md border border-border bg-muted object-cover"
            />
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-md border border-dashed border-border bg-muted" />
          )}
          <input
            className={`${inputClass} flex-1`}
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://... または /images/..."
            required
          />
        </div>
      </Field>

      <Field label="画像の代替テキスト">
        <input className={inputClass} value={coverImageAlt} onChange={(e) => setCoverImageAlt(e.target.value)} />
      </Field>

      <Field label="画像クレジット（撮影者/提供元。任意）">
        <input
          className={inputClass}
          value={coverImageCredit}
          onChange={(e) => setCoverImageCredit(e.target.value)}
          placeholder="例: 画像提供: AURALEE"
        />
      </Field>

      <div>
        <p className="text-xs font-semibold mb-2">追加の画像（記事内にギャラリー表示・任意）</p>
        <div className="space-y-3">
          {galleryImages.map((img, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
              <div className="col-span-2 flex items-center gap-2">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 貼り付けたURLの簡易プレビュー(外部ドメイン任意のため)
                  <img
                    key={img.url}
                    src={img.url}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-md border border-border bg-muted object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-md border border-dashed border-border bg-muted" />
                )}
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="画像URL（https://... または /images/...）"
                  value={img.url}
                  onChange={(e) => updateGalleryImage(i, { url: e.target.value })}
                />
              </div>
              <input
                className={inputClass}
                placeholder="代替テキスト"
                value={img.alt}
                onChange={(e) => updateGalleryImage(i, { alt: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="画像クレジット（任意）"
                value={img.credit ?? ""}
                onChange={(e) => updateGalleryImage(i, { credit: e.target.value })}
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
        <p className="text-xs font-semibold mb-2">情報元・参考（出典）</p>
        <p className="text-[11px] text-muted-foreground mb-2">記事下部の「情報元・参考」に表示される、この記事の元ネタ。</p>
        <div className="space-y-3">
          {sourceRefs.map((ref, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
              <input
                className={inputClass}
                placeholder="出典名（例: FASHIONSNAP）"
                value={ref.name}
                onChange={(e) => updateSourceRef(i, { name: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="URL"
                value={ref.url}
                onChange={(e) => updateSourceRef(i, { url: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeSourceRef(i)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                削除
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSourceRefs((prev) => [...prev, { name: "", url: "" }])}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
        >
          + 出典を追加
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2">
          この記事で紹介した商品・記事（任意・BUY/GUIDE型記事の内部リンク用）
        </p>
        <div className="space-y-3">
          {relatedArticles.map((l, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
              <input
                className={inputClass}
                placeholder="リンク先記事のタイトル"
                value={l.title}
                onChange={(e) => updateRelatedArticle(i, { title: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="リンク先記事のslug"
                value={l.slug}
                onChange={(e) => updateRelatedArticle(i, { slug: e.target.value })}
              />
              <input
                className={`${inputClass} col-span-2`}
                placeholder="補足（任意）"
                value={l.note ?? ""}
                onChange={(e) => updateRelatedArticle(i, { note: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeRelatedArticle(i)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                削除
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRelatedArticles((prev) => [...prev, { title: "", slug: "" }])}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
        >
          + 記事を追加
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2">
          ブランド公式のおすすめ商品（任意・写真+商品名+価格でカード表示、「PR」表記なしの公式直リンク）
        </p>
        <div className="space-y-3">
          {officialProducts.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
              <input
                className={`${inputClass} col-span-2`}
                placeholder="商品名（例: メンズ Clifton PRO クリフトン プロ）"
                value={p.name}
                onChange={(e) => updateOfficialProduct(i, { name: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="商品画像URL（ブランド公式サイトから）"
                value={p.image}
                onChange={(e) => updateOfficialProduct(i, { image: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="価格（任意、例: ¥22,000）"
                value={p.price ?? ""}
                onChange={(e) => updateOfficialProduct(i, { price: e.target.value })}
              />
              <input
                className={`${inputClass} col-span-2`}
                placeholder="商品ページURL（ブランド公式サイト）"
                value={p.url}
                onChange={(e) => updateOfficialProduct(i, { url: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeOfficialProduct(i)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                削除
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOfficialProducts((prev) => [...prev, { name: "", image: "", url: "" }])}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
        >
          + 商品を追加
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2">アフィリエイトリンク</p>

        <div className="flex flex-wrap gap-2 mb-1.5">
          <input
            className={`${inputClass} flex-1 min-w-[220px]`}
            placeholder="商品名・型番を入力（例: Nike Air Max 90 IM9616-001）"
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

      <div className="pt-4 border-t border-border">
        <button
          type="button"
          onClick={() => {
            router.push("/admin")
            router.refresh()
          }}
          className="w-full h-11 rounded-full border border-border text-sm font-semibold hover:bg-secondary"
        >
          管理画面に戻る
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
