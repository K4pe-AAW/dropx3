"use client"

import { useMemo, useState, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { Draft, Category, BrandCrawlSource, ColorwayInfo, ContentType } from "@/lib/types"
import { CONTENT_TYPES, inferContentType } from "@/lib/content-type"
import { siteConfig } from "@/lib/site-config"
import { QUICK_AFFILIATE_RETAILERS } from "@/lib/affiliate"
import { canonicalImageKey } from "@/lib/image-candidates"

type LinkDraft = { label: string; retailer: string; url: string; price: string }
type GalleryImageDraft = { url: string; alt: string; credit: string }
type OfficialLinkDraft = { label: string; url: string }
type SourceRefDraft = { name: string; url: string }
type PurchaseChannelDraft = {
  retailerName: string
  channelType: "official" | "secondary"
  saleMethod: "regular" | "lottery" | "unknown"
  date: string
  url: string
}

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"

export function PublishForm({ draft, brandSources }: { draft: Draft; brandSources: BrandCrawlSource[] }) {
  const router = useRouter()
  const [title, setTitle] = useState(draft.title)
  const [excerpt, setExcerpt] = useState(draft.excerpt)
  const [bodyText, setBodyText] = useState(draft.bodyParagraphs.join("\n\n"))
  const [category, setCategory] = useState<Category>(draft.category)
  const [contentType, setContentType] = useState<ContentType>(
    inferContentType(draft.category, draft.suggestedAffiliateSearch.length > 0)
  )
  const [brandsText, setBrandsText] = useState(draft.brands.join(", "))
  const [tagsText, setTagsText] = useState(draft.tags.join(", "))
  const [coverImage, setCoverImage] = useState(draft.suggestedCoverImage ?? "")
  const [coverImageAlt, setCoverImageAlt] = useState(draft.title)
  const [coverImageCredit, setCoverImageCredit] = useState("")
  const [youtubeVideoId, setYoutubeVideoId] = useState(draft.suggestedYoutubeVideoId ?? "")
  const [featured, setFeatured] = useState(false)
  const [scheduledPublishAt, setScheduledPublishAt] = useState("")
  const [links, setLinks] = useState<LinkDraft[]>([])
  const [autoLinkQuery, setAutoLinkQuery] = useState(draft.suggestedAffiliateSearch[0] ?? "")
  const [officialLinks, setOfficialLinks] = useState<OfficialLinkDraft[]>(
    (draft.suggestedOfficialLinks ?? []).map((l) => ({ label: l.label, url: l.url }))
  )
  const [sourceRefs, setSourceRefs] = useState<SourceRefDraft[]>(
    draft.sourceRefs.map((r) => ({ name: r.name, url: r.url }))
  )
  const [galleryImages, setGalleryImages] = useState<GalleryImageDraft[]>(
    (draft.suggestedGalleryImages ?? []).map((g) => ({ url: g.url, alt: g.alt, credit: g.credit ?? "" }))
  )
  /**
   * カラー展開はAI(初回下書き生成・SOURCE WATCH・ブラッシュアップ)からしか来ない値として
   * 割り切り、手入力の編集UIは持たない(2026-08-22、フォームをシンプルにする方針)。
   * 編集はできないが、既に付いている値を消さずそのまま送信する(ブラッシュアップが
   * 更新することはある)。
   */
  const [colorways, setColorways] = useState<ColorwayInfo[]>(draft.suggestedColorways ?? [])
  const [purchaseChannels, setPurchaseChannels] = useState<PurchaseChannelDraft[]>(
    (draft.suggestedPurchaseChannels ?? []).map((c) => ({
      retailerName: c.retailerName,
      channelType: c.channelType,
      saleMethod: c.saleMethod,
      date: c.date ?? "",
      url: c.url ?? "",
    }))
  )
  const [additionalSummary, setAdditionalSummary] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brushUpUrl, setBrushUpUrl] = useState("")
  const [brushingUp, setBrushingUp] = useState(false)
  const [brushUpError, setBrushUpError] = useState<string | null>(null)
  const [brushUpDone, setBrushUpDone] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [saveDraftError, setSaveDraftError] = useState<string | null>(null)
  const [saveDraftDone, setSaveDraftDone] = useState(false)
  const [publishedMessage, setPublishedMessage] = useState<string | null>(null)

  // RSS収集の下書きは著作権保護のためカバー画像を自動設定しない(YouTube以外)。ここでは画像を
  // 保存・転載するのではなく、著作権者が明確な情報源(ブランド公式サイト)を人間に示すだけに留める。
  const matchedBrandSources = useMemo(() => {
    const brandNames = brandsText
      .split(",")
      .map((b) => b.trim().toLowerCase())
      .filter(Boolean)
    if (brandNames.length === 0) return []
    return brandSources.filter((s) => brandNames.includes(s.name.toLowerCase()))
  }, [brandsText, brandSources])

  function updateLink(i: number, patch: Partial<LinkDraft>) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i))
  }

  /**
   * 商品名を1回入力するだけで、自動生成できる店舗(メルカリ・Yahoo!ショッピング等)のリンクを
   * まとめて追加する。店舗ごとにプロンプトで聞き直す必要をなくし、非技術者でも迷わず使える形にする。
   */
  function addAutoLinks() {
    const query = autoLinkQuery.trim()
    if (!query) {
      window.alert("商品名やキーワードを入力してください（例: Nike Air Max 90 IM9616-001）")
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

  function updateGalleryImage(i: number, patch: Partial<GalleryImageDraft>) {
    setGalleryImages((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)))
  }
  function removeGalleryImage(i: number) {
    setGalleryImages((prev) => prev.filter((_, idx) => idx !== i))
  }
  function updateOfficialLink(i: number, patch: Partial<OfficialLinkDraft>) {
    setOfficialLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function removeOfficialLink(i: number) {
    setOfficialLinks((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateSourceRef(i: number, patch: Partial<SourceRefDraft>) {
    setSourceRefs((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function removeSourceRef(i: number) {
    setSourceRefs((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updatePurchaseChannel(i: number, patch: Partial<PurchaseChannelDraft>) {
    setPurchaseChannels((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }
  function removePurchaseChannel(i: number) {
    setPurchaseChannels((prev) => prev.filter((_, idx) => idx !== i))
  }

  function buildRequestBody(): Record<string, unknown> {
    const affiliateLinks = links
      .filter((l) => l.url.trim())
      .map((l) => ({
        label: l.label.trim() || "商品を見る",
        retailer: l.retailer.trim(),
        url: l.url.trim(),
        ...(l.price.trim() ? { price: l.price.trim() } : {}),
      }))

    return {
      title,
      excerpt,
      bodyParagraphs: [
        ...bodyText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
        ...additionalSummary.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      ],
      category,
      contentType,
      brands: brandsText.split(",").map((b) => b.trim()).filter(Boolean),
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      coverImage,
      coverImageAlt,
      ...(coverImageCredit.trim() ? { coverImageCredit: coverImageCredit.trim() } : {}),
      featured,
      ...(youtubeVideoId.trim() ? { youtubeVideoId: youtubeVideoId.trim() } : {}),
      affiliateLinks,
      galleryImages: galleryImages
        .filter((g) => g.url.trim())
        .map((g) => ({
          url: g.url.trim(),
          alt: g.alt.trim() || title,
          ...(g.credit.trim() ? { credit: g.credit.trim() } : {}),
        })),
      officialLinks: officialLinks.filter((l) => l.url.trim()),
      colorways,
      purchaseChannels: purchaseChannels
        .filter((c) => c.retailerName.trim())
        .map((c) => ({
          retailerName: c.retailerName.trim(),
          channelType: c.channelType,
          saleMethod: c.saleMethod,
          ...(c.date.trim() ? { date: c.date.trim() } : {}),
          ...(c.url.trim() ? { url: c.url.trim() } : {}),
        })),
      sourceRefs: sourceRefs.filter((r) => r.name.trim() && r.url.trim()),
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const isScheduled = Boolean(scheduledPublishAt)
    const endpoint = isScheduled ? `/api/drafts/${draft.id}/schedule` : `/api/drafts/${draft.id}/publish`
    const body = buildRequestBody()
    if (isScheduled) body.scheduledPublishAt = new Date(scheduledPublishAt).toISOString()

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    setSubmitting(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || (isScheduled ? "予約に失敗しました" : "公開に失敗しました"))
      return
    }

    setPublishedMessage(isScheduled ? "予約を設定しました。" : "公開しました。")
  }

  async function handleScheduleNext() {
    setSubmitting(true)
    setError(null)

    const res = await fetch(`/api/drafts/${draft.id}/schedule-next`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestBody()),
    })
    const data = await res.json().catch(() => ({}))

    setSubmitting(false)

    if (!res.ok) {
      setError(data.error || "予約に失敗しました")
      return
    }

    const when =
      typeof data.scheduledPublishAt === "string"
        ? new Date(data.scheduledPublishAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
        : null
    setPublishedMessage(when ? `${when}に予約しました。` : "予約しました。")
  }

  async function handleReject() {
    if (!confirm("この下書きを却下しますか？")) return
    await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" })
    router.push("/admin")
    router.refresh()
  }

  /** 公開はせず、今の編集内容だけを下書きに書き戻す(ページを離れても内容が消えないように) */
  async function handleSaveDraft() {
    setSavingDraft(true)
    setSaveDraftError(null)
    setSaveDraftDone(false)
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "下書きの保存に失敗しました")
      setSaveDraftDone(true)
    } catch (err) {
      setSaveDraftError(err instanceof Error ? err.message : "下書きの保存に失敗しました")
    } finally {
      setSavingDraft(false)
    }
  }

  /**
   * 参考ページ(公式サイトとは限らない)のURLを渡し、その内容でタイトル/要約/本文/カラー展開/
   * 画像候補/情報元リンクを補って書き直す。まだ何も保存はしない(このフォームの入力欄が
   * 更新されるだけ)ので、結果が気に入らなければページを再読み込みすれば元の下書きの状態に戻る。
   */
  async function handleBrushUp() {
    const url = brushUpUrl.trim()
    if (!url) {
      setBrushUpError("URLを入力してください")
      return
    }
    setBrushingUp(true)
    setBrushUpError(null)
    setBrushUpDone(false)
    try {
      const res = await fetch("/api/admin/drafts/brushup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title,
          excerpt,
          bodyParagraphs: bodyText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
          colorways,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "ブラッシュアップに失敗しました")

      setTitle(data.title)
      setExcerpt(data.excerpt)
      setBodyText((data.bodyParagraphs as string[]).join("\n\n"))

      const freshColorways = data.colorways as
        | { colorName: string; styleCode?: string; price?: string; size?: string; releaseDate?: string }[]
        | undefined
      if (freshColorways && freshColorways.length > 0) {
        setColorways((prev) => {
          const next = [...prev]
          for (const f of freshColorways) {
            const idx = next.findIndex((c) => c.colorName.trim().toLowerCase() === f.colorName.trim().toLowerCase())
            if (idx >= 0) {
              next[idx] = {
                ...next[idx],
                styleCode: f.styleCode || next[idx].styleCode,
                price: f.price || next[idx].price,
                size: f.size || next[idx].size,
                releaseDate: f.releaseDate || next[idx].releaseDate,
              }
            } else {
              next.push({
                colorName: f.colorName,
                ...(f.styleCode ? { styleCode: f.styleCode } : {}),
                ...(f.price ? { price: f.price } : {}),
                ...(f.size ? { size: f.size } : {}),
                ...(f.releaseDate ? { releaseDate: f.releaseDate } : {}),
              })
            }
          }
          return next
        })
      }

      const sourceRef = data.sourceRef as { name: string; url: string } | undefined
      if (sourceRef?.url) {
        setSourceRefs((prev) => (prev.some((r) => r.url === sourceRef.url) ? prev : [...prev, sourceRef]))
      }

      const imageCandidates = Array.isArray(data.imageCandidates) ? (data.imageCandidates as string[]) : []
      if (imageCandidates.length > 0) {
        const existingUrls = new Set(
          [coverImage, ...galleryImages.map((g) => g.url)].filter(Boolean).map(canonicalImageKey)
        )
        let nextCoverImage = coverImage
        const newImages: GalleryImageDraft[] = []
        for (const u of imageCandidates) {
          const imageKey = canonicalImageKey(u)
          if (existingUrls.has(imageKey)) continue
          existingUrls.add(imageKey)
          if (!nextCoverImage) {
            nextCoverImage = u
            continue
          }
          newImages.push({ url: u, alt: data.title || title, credit: "" })
        }
        if (nextCoverImage !== coverImage) setCoverImage(nextCoverImage)
        if (newImages.length > 0) setGalleryImages((prev) => [...prev, ...newImages])
      }

      setBrushUpDone(true)
    } catch (err) {
      setBrushUpError(err instanceof Error ? err.message : "ブラッシュアップに失敗しました")
    } finally {
      setBrushingUp(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-accent bg-accent/5 p-4">
        <p className="text-xs font-bold mb-1">URLでブラッシュアップ（任意）</p>
        <p className="text-[11px] text-muted-foreground mb-3">
          参考にしたいページのURL（公式サイトに限らず、詳しいニュース記事等でも可）を貼ると、その内容でタイトル・要約・本文・カラー展開・情報元リンク・画像候補を補って書き直します。タイトル・要約・本文は上書きされます（結果が気に入らなければページを再読み込みしてください）。
        </p>
        <div className="flex flex-wrap gap-2 items-start">
          <input
            value={brushUpUrl}
            onChange={(e) => setBrushUpUrl(e.target.value)}
            placeholder="https://参考にしたいページのURL"
            type="url"
            className={`${inputClass} flex-1 min-w-72`}
          />
          <button
            type="button"
            onClick={handleBrushUp}
            disabled={brushingUp}
            className="h-9 px-4 rounded-full bg-accent text-accent-foreground text-sm font-bold disabled:opacity-50 whitespace-nowrap"
          >
            {brushingUp ? "ブラッシュアップ中…(数十秒かかります)" : "ブラッシュアップする"}
          </button>
        </div>
        {brushUpError && <p className="text-xs text-destructive mt-2">{brushUpError}</p>}
        {brushUpDone && !brushUpError && (
          <p className="text-xs text-accent-foreground mt-2">参考ページの情報を反映しました。内容を確認してください。</p>
        )}
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

      <Field label="追加の概要・補足（任意・本文の続きとして公開されます）">
        <textarea
          className={inputClass}
          rows={4}
          value={additionalSummary}
          onChange={(e) => setAdditionalSummary(e.target.value)}
          placeholder="AIが書いた本文に付け加えたい情報があれば(空行区切りで複数段落可)"
        />
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
            placeholder="https://..."
            required
          />
        </div>
        {!coverImage && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {matchedBrandSources.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-accent-foreground underline hover:text-foreground"
              >
                {s.name}公式サイトで画像を確認
              </a>
            ))}
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(brandsText || title)}&tbm=isch`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground underline hover:text-foreground"
            >
              画像を検索して探す
            </a>
          </div>
        )}
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

      {category === "youtube" && (
        <Field label="YouTube動画ID（記事内で公式プレイヤーとして埋め込み表示）">
          <input
            className={inputClass}
            value={youtubeVideoId}
            onChange={(e) => setYoutubeVideoId(e.target.value)}
            placeholder="例: 5YLKl50OjQc（watch?v=の後ろの部分）"
          />
        </Field>
      )}

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
                value={img.credit}
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
          onClick={() => setGalleryImages((prev) => [...prev, { url: "", alt: "", credit: "" }])}
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
                onChange={(e) => updatePurchaseChannel(i, { channelType: e.target.value as PurchaseChannelDraft["channelType"] })}
              >
                <option value="official">公式・正規販売店</option>
                <option value="secondary">セレクト店・二次流通</option>
              </select>
              <select
                className={inputClass}
                value={c.saleMethod}
                onChange={(e) => updatePurchaseChannel(i, { saleMethod: e.target.value as PurchaseChannelDraft["saleMethod"] })}
              >
                <option value="regular">通常販売</option>
                <option value="lottery">抽選</option>
                <option value="unknown">販売方法未確認</option>
              </select>
              <input
                className={inputClass}
                placeholder="日程（例: 9月1日〜9月7日 応募）"
                value={c.date}
                onChange={(e) => updatePurchaseChannel(i, { date: e.target.value })}
              />
              <input
                className={`${inputClass} col-span-2`}
                placeholder="店舗URL（任意）"
                value={c.url}
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
            setPurchaseChannels((prev) => [
              ...prev,
              { retailerName: "", channelType: "official", saleMethod: "unknown", date: "", url: "" },
            ])
          }
          className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
        >
          + 店舗を追加
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
        <p className="text-xs font-semibold mb-2">アフィリエイトリンク（複数可）</p>

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
                placeholder="ボタン文言（例: 楽天市場で探す）"
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
          + 空欄のリンクを追加
        </button>
      </div>

      <Field label="公開日時（任意・指定すればその時刻まで非公開のまま予約されます）">
        <input
          type="datetime-local"
          className={inputClass}
          value={scheduledPublishAt}
          onChange={(e) => setScheduledPublishAt(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleScheduleNext}
            disabled={submitting || Boolean(publishedMessage)}
            className="h-8 px-3 rounded-full border border-border text-xs font-semibold hover:bg-secondary disabled:opacity-50"
          >
            次の空き枠へ予約する
          </button>
          <span className="text-[11px] text-muted-foreground">
            8〜22時・2時間おき・1枠2件のペースで、次に空いている枠へ自動で割り当てます（日時は指定不要）
          </span>
        </div>
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          type="submit"
          disabled={submitting || Boolean(publishedMessage)}
          className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? "処理中..." : scheduledPublishAt ? "予約公開する" : "公開する"}
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={savingDraft || Boolean(publishedMessage)}
          className="h-11 px-6 rounded-full border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {savingDraft ? "保存中..." : "下書きを保存"}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={Boolean(publishedMessage)}
          className="h-11 px-6 rounded-full border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-50"
        >
          却下する
        </button>
      </div>
      {publishedMessage && (
        <p className="text-sm font-semibold text-accent-foreground bg-accent/10 rounded-lg px-4 py-3">
          {publishedMessage}
        </p>
      )}
      {saveDraftError && <p className="text-sm text-destructive">{saveDraftError}</p>}
      {saveDraftDone && !saveDraftError && (
        <p className="text-sm text-accent-foreground">下書きを保存しました(公開はまだされていません)。</p>
      )}

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
