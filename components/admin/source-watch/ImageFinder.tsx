"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { imageStatusOf } from "@/lib/source-watch/image-rights"
import { gradeImageAsset } from "@/lib/source-watch/image-quality"
import { IMAGE_CATEGORY_BUCKET, IMAGE_SOURCE_TYPES, IMAGE_SOURCE_TYPE_LABEL, type ImageCategoryBucket } from "@/lib/source-watch/labels"
import type { ImageAsset, ImageSourceType, SourceLink } from "@/lib/source-watch/types"
import type { ProductCard as ProductCardData } from "@/lib/source-watch/present"
import { ImageStatusChip, QualityGradeBadge } from "./badges"
import { resolvePublisher } from "./resolve-publisher"

const CATEGORY_TABS: { key: "all" | ImageCategoryBucket; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "official", label: "OFFICIAL" },
  { key: "press", label: "PRESS" },
  { key: "affiliate", label: "AFFILIATE" },
  { key: "retailer", label: "RETAILER" },
  { key: "social", label: "SOCIAL" },
]

const STATUS_ORDER: Record<string, number> = { usable: 0, review: 1, embed_only: 2, unusable: 3 }
const GRADE_ORDER: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }

function ImageCandidateCard({
  asset,
  publisherName,
  onAdopt,
  adopting,
}: {
  asset: ImageAsset
  publisherName: string
  onAdopt: (id: string) => void
  adopting: boolean
}) {
  const status = imageStatusOf(asset)
  const grade = gradeImageAsset(asset)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-[4/3] bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element -- 出典ごとに画像ドメインが異なるためnext/imageのremotePatternsを固定できない */}
        <img src={asset.url} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
      <div className="space-y-1.5 p-2.5">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-[10px] font-bold text-muted-foreground">{publisherName}</span>
          <QualityGradeBadge grade={grade} />
        </div>
        <p className="font-mono text-[10px] text-muted-foreground/70">
          {asset.width && asset.height ? `${asset.width} × ${asset.height}` : "解像度未取得"}
        </p>
        <ImageStatusChip level={status} />

        {status === "unusable" && (
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            理由: {asset.sourceType === "third_party_media" ? "第三者メディアの画像(自動使用不可)" : "権利上使用不可"}
            <br />
            <a href={asset.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              Sourceを見る
            </a>
          </p>
        )}
        {status === "review" && (
          <button
            onClick={() => onAdopt(asset.id)}
            disabled={adopting}
            className="h-7 w-full rounded-full bg-primary text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            {adopting ? "採用中..." : "この画像を採用"}
          </button>
        )}
        {status === "usable" && <p className="text-[10px] font-semibold text-emerald-700">✓ 採用済み</p>}
        {status === "embed_only" && <p className="text-[10px] text-muted-foreground">埋め込み表示のみ(保存・加工不可)</p>}
      </div>
    </div>
  )
}

function ManualAddForm({ productId, onAdded }: { productId: string; onAdded: (card: ProductCardData) => void }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [sourceType, setSourceType] = useState<ImageSourceType>("affiliate_asset")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/source-watch/products/${productId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), sourceType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onAdded(data as ProductCardData)
      setUrl("")
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "追加に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] text-muted-foreground underline hover:text-foreground">
        + 画像URLを追加
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
      <input
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-ring"
        placeholder="https://... (画像URL)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <select
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-ring"
        value={sourceType}
        onChange={(e) => setSourceType(e.target.value as ImageSourceType)}
      >
        {IMAGE_SOURCE_TYPES.map((t) => (
          <option key={t} value={t}>
            {IMAGE_SOURCE_TYPE_LABEL[t]}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={loading || !url.trim()}
          className="h-7 rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? "追加中..." : "追加"}
        </button>
        <button onClick={() => setOpen(false)} className="text-[11px] text-muted-foreground hover:text-foreground">
          キャンセル
        </button>
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

export function ImageFinder({
  productId,
  images,
  sourceLinks,
  onAdopted,
  onAdded,
}: {
  productId: string
  images: ImageAsset[]
  sourceLinks: SourceLink[]
  onAdopted: (card: ProductCardData) => void
  onAdded: (card: ProductCardData) => void
}) {
  const [category, setCategory] = useState<"all" | ImageCategoryBucket>("all")
  const [adoptingId, setAdoptingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<ImageCategoryBucket, number> = { official: 0, press: 0, affiliate: 0, retailer: 0, social: 0, early: 0 }
    for (const img of images) {
      if (img.sourceType === "editorial_placeholder") continue
      c[IMAGE_CATEGORY_BUCKET[img.sourceType]]++
    }
    return c
  }, [images])

  const sorted = useMemo(() => {
    const filtered =
      category === "all" ? images : images.filter((img) => img.sourceType !== "editorial_placeholder" && IMAGE_CATEGORY_BUCKET[img.sourceType] === category)
    return [...filtered].sort((a, b) => {
      const statusDiff = STATUS_ORDER[imageStatusOf(a)] - STATUS_ORDER[imageStatusOf(b)]
      if (statusDiff !== 0) return statusDiff
      const ga = gradeImageAsset(a)
      const gb = gradeImageAsset(b)
      return (ga ? GRADE_ORDER[ga] : 9) - (gb ? GRADE_ORDER[gb] : 9)
    })
  }, [images, category])

  async function adopt(assetId: string) {
    setAdoptingId(assetId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/source-watch/images/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rightsStatus: "approved" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onAdopted(data as ProductCardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "採用に失敗しました")
    } finally {
      setAdoptingId(null)
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setCategory(t.key)}
            className={cn(
              "h-7 rounded-full border px-2.5 text-[11px] font-semibold transition-colors",
              category === t.key ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {t.label} {t.key !== "all" && <span className="opacity-60">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      {error && <p className="mb-2 text-[11px] text-destructive">{error}</p>}

      {sorted.length === 0 ? (
        <p className="mb-3 text-[11px] text-muted-foreground">候補がありません。下から手動で追加できます。</p>
      ) : (
        <div className="mb-3 grid grid-cols-2 gap-2.5">
          {sorted.map((asset) => (
            <ImageCandidateCard
              key={asset.id}
              asset={asset}
              publisherName={resolvePublisher(asset, sourceLinks)}
              onAdopt={adopt}
              adopting={adoptingId === asset.id}
            />
          ))}
        </div>
      )}

      <ManualAddForm productId={productId} onAdded={onAdded} />
    </div>
  )
}
