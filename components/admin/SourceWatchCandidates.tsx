"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { ProductCard } from "@/lib/source-watch/present"
import type { ConfidenceTier } from "@/lib/source-watch/types"

const TIER_STYLE: Record<ConfidenceTier, string> = {
  CONFIRMED: "bg-primary text-primary-foreground",
  REPORTED: "bg-accent text-accent-foreground",
  RUMOR: "bg-secondary text-muted-foreground",
}
const READINESS_STYLE: Record<string, string> = {
  READY: "text-primary",
  REVIEW: "text-accent-foreground",
  HOLD: "text-muted-foreground",
}

const selectClass = "rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring bg-background"

export function SourceWatchCandidates({ initialCards }: { initialCards: ProductCard[] }) {
  const [cards, setCards] = useState(initialCards)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    tier: "",
    hasImage: "",
    rights: "",
    domestic: "",
    purchaseLink: "",
    brand: "",
    source: "",
    minScore: "",
  })

  const brandOptions = useMemo(
    () => [...new Set(initialCards.map((c) => c.product.brand).filter((b): b is string => Boolean(b)))].sort(),
    [initialCards]
  )
  const sourceOptions = useMemo(() => [...new Set(initialCards.flatMap((c) => c.sourceNames))].sort(), [initialCards])

  async function applyFilters(patch: Partial<typeof filters>) {
    const next = { ...filters, ...patch }
    setFilters(next)
    setLoading(true)
    try {
      const params = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][])
      const res = await fetch(`/api/admin/source-watch/products?${params.toString()}`)
      const data = await res.json()
      setCards(data.products ?? [])
    } finally {
      setLoading(false)
    }
  }

  function removeCard(productId: string) {
    setCards((prev) => prev.filter((c) => c.product.id !== productId))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select className={selectClass} value={filters.tier} onChange={(e) => applyFilters({ tier: e.target.value })}>
          <option value="">すべてのステータス</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="REPORTED">REPORTED</option>
          <option value="RUMOR">RUMOR</option>
        </select>
        <select className={selectClass} value={filters.hasImage} onChange={(e) => applyFilters({ hasImage: e.target.value })}>
          <option value="">画像:すべて</option>
          <option value="true">画像あり</option>
          <option value="false">画像なし</option>
        </select>
        <select className={selectClass} value={filters.rights} onChange={(e) => applyFilters({ rights: e.target.value })}>
          <option value="">Rights:すべて</option>
          <option value="approved">Rights Approved</option>
          <option value="review_required">Rights Review Required</option>
        </select>
        <select className={selectClass} value={filters.domestic} onChange={(e) => applyFilters({ domestic: e.target.value })}>
          <option value="">国内販売:すべて</option>
          <option value="true">国内販売あり</option>
          <option value="false">国内販売未確認</option>
        </select>
        <select className={selectClass} value={filters.purchaseLink} onChange={(e) => applyFilters({ purchaseLink: e.target.value })}>
          <option value="">購入リンク:すべて</option>
          <option value="true">購入リンクあり</option>
          <option value="false">購入リンクなし</option>
        </select>
        <select className={selectClass} value={filters.brand} onChange={(e) => applyFilters({ brand: e.target.value })}>
          <option value="">ブランド:すべて</option>
          {brandOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select className={selectClass} value={filters.source} onChange={(e) => applyFilters({ source: e.target.value })}>
          <option value="">Source:すべて</option>
          {sourceOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Score以上"
          className={`${selectClass} w-24`}
          value={filters.minScore}
          onChange={(e) => applyFilters({ minScore: e.target.value })}
        />
      </div>

      {loading && <p className="text-xs text-muted-foreground mb-3">読み込み中...</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <ProductCardView key={c.product.id} card={c} onRemoved={() => removeCard(c.product.id)} />
        ))}
      </div>
      {!loading && cards.length === 0 && <p className="text-sm text-muted-foreground">条件に合う候補はありません。</p>}
    </div>
  )
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <p className={ok ? "text-foreground" : "text-muted-foreground/60"}>
      {ok ? "✓" : "×"} {label}
    </p>
  )
}

function ProductCardView({ card, onRemoved }: { card: ProductCard; onRemoved: () => void }) {
  const router = useRouter()
  const { product } = card
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFindPrimary, setShowFindPrimary] = useState(false)

  const title = [product.brand, product.productName].filter(Boolean).join(" ") || "商品名未確認"
  const firstColorway = product.colorways[0]

  async function act(path: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/source-watch/products/${product.id}/${path}`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "失敗しました")
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "失敗しました")
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function handleHold() {
    try {
      await act("hold")
      onRemoved()
    } catch {
      /* エラーはerrorステートで表示済み */
    }
  }
  async function handleIgnore() {
    try {
      await act("ignore")
      onRemoved()
    } catch {
      /* noop */
    }
  }
  async function handleDraft() {
    try {
      const data = await act("draft")
      router.push(`/admin/drafts/${data.draftId}`)
    } catch {
      /* noop */
    }
  }

  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${TIER_STYLE[product.tier]}`}>{product.tier}</span>
        <span className={`text-[11px] font-bold ${READINESS_STYLE[product.readiness]}`}>
          {product.readiness} ({product.readinessScore}点)
        </span>
      </div>

      <h3 className="text-sm font-black mb-1">{title}</h3>
      <p className="text-[11px] text-muted-foreground mb-3">
        Source: {card.sourceNames.join(", ") || "不明"} / Score: {product.sourceScore}
      </p>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
        <Check ok={Boolean(product.productName)} label="Product Name" />
        <Check ok={Boolean(product.styleCode)} label="Style Code" />
        <Check ok={Boolean(firstColorway?.releaseDate)} label="Release Date" />
        <Check ok={Boolean(firstColorway?.price)} label="Price" />
        <Check ok={product.domesticConfirmed} label="Japan Release" />
        <Check ok={product.officialConfirmed} label="Official確認" />
        <Check ok={card.hasUsableImage} label={`Image (${card.imageRightsSummary})`} />
        <Check ok={card.hasNonBrandTopPurchaseLink} label="購入リンク" />
      </div>

      {product.blockReasons.length > 0 && (
        <p className="text-[11px] text-destructive mb-3">ブロック理由: {product.blockReasons.join(" / ")}</p>
      )}

      <p className="text-[10px] text-muted-foreground/60 mb-3">検出: {new Date(product.firstDetectedAt).toLocaleString("ja-JP")}</p>

      {error && <p className="text-[11px] text-destructive mb-2">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {product.tier === "CONFIRMED" && (
          <button
            onClick={handleDraft}
            disabled={busy}
            className="h-8 px-3 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-50"
          >
            記事候補を見る
          </button>
        )}
        {product.tier === "REPORTED" && (
          <button
            onClick={() => setShowFindPrimary((v) => !v)}
            className="h-8 px-3 rounded-full border border-border text-[11px] font-semibold hover:bg-secondary"
          >
            公式情報・画像を検索
          </button>
        )}
        {product.tier !== "RUMOR" && (
          <button onClick={handleHold} disabled={busy} className="h-8 px-3 rounded-full border border-border text-[11px] font-semibold hover:bg-secondary disabled:opacity-50">
            保留
          </button>
        )}
        {product.tier === "RUMOR" && (
          <>
            <button onClick={handleHold} disabled={busy} className="h-8 px-3 rounded-full border border-border text-[11px] font-semibold hover:bg-secondary disabled:opacity-50">
              保留
            </button>
            <button onClick={handleIgnore} disabled={busy} className="h-8 px-3 rounded-full border border-border text-[11px] font-semibold hover:bg-secondary disabled:opacity-50">
              無視
            </button>
          </>
        )}
      </div>

      {showFindPrimary && <FindPrimaryPanel productId={product.id} onConfirmed={() => window.location.reload()} />}
    </div>
  )
}

function FindPrimaryPanel({ productId, onConfirmed }: { productId: string; onConfirmed: () => void }) {
  const [links, setLinks] = useState<{ label: string; url: string }[] | null>(null)
  const [manualUrl, setManualUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadSuggestions() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/source-watch/products/${productId}/find-primary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLinks(data.searchUrls)
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  async function confirmPrimary() {
    if (!manualUrl.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/source-watch/products/${productId}/find-primary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: manualUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onConfirmed()
    } catch (err) {
      setError(err instanceof Error ? err.message : "確定に失敗しました")
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      {!links && (
        <button onClick={loadSuggestions} disabled={loading} className="text-[11px] underline text-muted-foreground hover:text-foreground">
          {loading ? "検索候補を取得中..." : "検索の出発点を表示"}
        </button>
      )}
      {links && (
        <ul className="space-y-1 mb-2">
          {links.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent-foreground underline">
                {l.label}を開く
              </a>
            </li>
          ))}
          {links.length === 0 && <li className="text-[11px] text-muted-foreground">登録済みの公式ソースが見つかりませんでした。検索エンジンで確認してください。</li>}
        </ul>
      )}
      <p className="text-[10px] text-muted-foreground mb-1">一次情報のURLを見つけたら貼り付けて確定してください(CONFIRMEDに変わります):</p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-border px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-ring bg-background"
          placeholder="https://..."
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
        />
        <button
          onClick={confirmPrimary}
          disabled={loading || !manualUrl.trim()}
          className="h-7 px-3 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-50"
        >
          確定
        </button>
      </div>
      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
    </div>
  )
}
