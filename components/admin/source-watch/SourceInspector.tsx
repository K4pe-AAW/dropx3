"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ProductCard as ProductCardData } from "@/lib/source-watch/present"
import { ImageStatusChip, QualityGradeBadge, ReadinessBadge, TierBadge } from "./badges"
import { ProductPipeline } from "./ProductPipeline"
import { MissingInformation } from "./MissingInformation"
import { ImageRoute } from "./ImageRoute"
import { ImageFinder } from "./ImageFinder"
import { CommerceStatus } from "./CommerceStatus"
import { resolvePublisher } from "./resolve-publisher"
import type { FocusTarget } from "./missing-actions"

async function fetchFreshCard(productId: string): Promise<ProductCardData | null> {
  try {
    const res = await fetch(`/api/admin/source-watch/products/${productId}`)
    if (!res.ok) return null
    return (await res.json()) as ProductCardData
  } catch {
    return null
  }
}

function SectionHeader({ label }: { label: string }) {
  return <h3 className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground/70">{label}</h3>
}

function ConfirmPrimaryPanel({
  productId,
  mode,
  onConfirmed,
}: {
  productId: string
  mode: "official" | "domestic"
  onConfirmed: (card: ProductCardData) => void
}) {
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

  async function confirm() {
    if (!manualUrl.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/source-watch/products/${productId}/find-primary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: manualUrl.trim(), markDomestic: mode === "domestic" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const fresh = await fetchFreshCard(productId)
      if (fresh) onConfirmed(fresh)
      setManualUrl("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "確定に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-dashed border-border p-3">
      {!links && (
        <button onClick={loadSuggestions} disabled={loading} className="text-[11px] text-muted-foreground underline hover:text-foreground">
          {loading ? "検索候補を取得中..." : "検索の出発点を表示"}
        </button>
      )}
      {links && (
        <ul className="space-y-1">
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
      <p className="text-[10px] text-muted-foreground">
        {mode === "domestic" ? "国内正規販売店のURLが見つかったら貼り付けてください:" : "公式のURLが見つかったら貼り付けてください:"}
      </p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-ring"
          placeholder="https://..."
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
        />
        <button
          onClick={confirm}
          disabled={loading || !manualUrl.trim()}
          className="h-7 rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          確定
        </button>
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

export function SourceInspector({
  card,
  focus,
  onClose,
  onCardUpdated,
  onRemoved,
}: {
  card: ProductCardData
  focus?: FocusTarget
  onClose: () => void
  onCardUpdated: (card: ProductCardData) => void
  onRemoved: (productId: string) => void
}) {
  const router = useRouter()
  const { product } = card

  // focus/商品が変わるたびに呼び出し側(SourceWatchDashboard)がkeyを変えて本コンポーネントを
  // 再マウントするため、これらのuseState初期値だけで「該当パネルを開いた状態で開始する」を満たせる
  // (effect内で複数setStateする再同期は不要 — Reactの推奨パターン)。
  const [officialPanelOpen, setOfficialPanelOpen] = useState(focus === "official")
  const [domesticPanelOpen, setDomesticPanelOpen] = useState(focus === "domestic")
  const [imageFinderOpen, setImageFinderOpen] = useState(focus === "image")
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(focus === "purchase")
  const [purchaseUrl, setPurchaseUrl] = useState("")
  const [purchaseBusy, setPurchaseBusy] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function addPurchaseLink() {
    if (!purchaseUrl.trim()) return
    setPurchaseBusy(true)
    setPurchaseError(null)
    try {
      const res = await fetch(`/api/admin/source-watch/products/${product.id}/purchase-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: purchaseUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const fresh = await fetchFreshCard(product.id)
      if (fresh) onCardUpdated(fresh)
      setPurchaseUrl("")
      setPurchaseFormOpen(false)
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : "追加に失敗しました")
    } finally {
      setPurchaseBusy(false)
    }
  }

  async function act(path: string) {
    setActionBusy(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/source-watch/products/${product.id}/${path}`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "失敗しました")
      return data
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "失敗しました")
      throw err
    } finally {
      setActionBusy(false)
    }
  }
  async function handleHold() {
    try {
      await act("hold")
      onRemoved(product.id)
    } catch {
      /* エラーはactionErrorで表示済み */
    }
  }
  async function handleIgnore() {
    try {
      await act("ignore")
      onRemoved(product.id)
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

  async function refreshAfterImageAction() {
    const fresh = await fetchFreshCard(product.id)
    if (fresh) onCardUpdated(fresh)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{product.brand ?? "ブランド不明"}</p>
          <h2 className="text-base font-black leading-snug">{product.productName ?? "商品名未確認"}</h2>
          {product.styleCode && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{product.styleCode}</p>}
          <div className="mt-2 flex items-center gap-2">
            <ReadinessBadge readiness={product.readiness} score={product.readinessScore} />
            <TierBadge tier={product.tier} />
          </div>
        </div>
        <button onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded-full text-lg leading-none hover:bg-secondary" aria-label="閉じる">
          ×
        </button>
      </div>

      <div className="px-4 pt-3">
        <ProductPipeline card={card} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section>
          <SectionHeader label="INFORMATION" />
          {product.officialConfirmed ? (
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="font-bold text-emerald-700">✓ Official</span>
              {card.officialSourceLink && (
                <a href={card.officialSourceLink.url} target="_blank" rel="noopener noreferrer" className="truncate text-muted-foreground underline hover:text-foreground">
                  {card.officialSourceLink.publisher}
                </a>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-1.5 text-[12px] text-muted-foreground">× 未確認</p>
              <button onClick={() => setOfficialPanelOpen((v) => !v)} className="text-[11px] text-muted-foreground underline hover:text-foreground">
                {officialPanelOpen ? "閉じる" : "公式情報を探す"}
              </button>
              {officialPanelOpen && <ConfirmPrimaryPanel productId={product.id} mode="official" onConfirmed={onCardUpdated} />}
            </div>
          )}
        </section>

        <section className="border-t border-border pt-4">
          <SectionHeader label="JAPAN" />
          {product.domesticConfirmed ? (
            <p className="text-[12px] font-bold text-emerald-700">✓ Confirmed</p>
          ) : (
            <div>
              <p className="mb-1.5 text-[12px] text-muted-foreground">△ 未確認</p>
              <button onClick={() => setDomesticPanelOpen((v) => !v)} className="text-[11px] text-muted-foreground underline hover:text-foreground">
                {domesticPanelOpen ? "閉じる" : "国内販売を探す"}
              </button>
              {domesticPanelOpen && <ConfirmPrimaryPanel productId={product.id} mode="domestic" onConfirmed={onCardUpdated} />}
            </div>
          )}
        </section>

        <section className="border-t border-border pt-4">
          <SectionHeader label="IMAGE" />
          <div className="mb-2 flex items-center gap-3">
            <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
              {card.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- 出典ごとに画像ドメインが異なるためnext/imageのremotePatternsを固定できない
                <img src={card.coverImage.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-[8px] font-bold tracking-wide text-muted-foreground/50">
                  IMAGE
                  <br />
                  PENDING
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5">
                <ImageStatusChip level={card.imageStatus.level} />
                <QualityGradeBadge grade={card.imageStatus.bestGrade} />
              </div>
              {card.coverImage && <p className="truncate text-[10px] text-muted-foreground">{resolvePublisher(card.coverImage, card.sourceLinks)}</p>}
            </div>
          </div>
          {card.coverImage && (
            <div className="mb-2 rounded-lg border border-border p-2.5">
              <ImageRoute asset={card.coverImage} publisherName={resolvePublisher(card.coverImage, card.sourceLinks)} />
            </div>
          )}
          <button onClick={() => setImageFinderOpen((v) => !v)} className="text-[11px] text-muted-foreground underline hover:text-foreground">
            {imageFinderOpen ? "閉じる" : card.images.length > 0 ? "画像候補を見る・変更" : "画像を探す"}
          </button>
          {imageFinderOpen && (
            <div className="mt-3">
              <ImageFinder
                productId={product.id}
                images={card.images}
                sourceLinks={card.sourceLinks}
                onAdopted={refreshAfterImageAction}
                onAdded={refreshAfterImageAction}
              />
            </div>
          )}
        </section>

        <section className="border-t border-border pt-4">
          <SectionHeader label="COMMERCE" />
          <CommerceStatus candidates={product.purchaseLinkCandidates} />
          <button onClick={() => setPurchaseFormOpen((v) => !v)} className="mt-2 text-[11px] text-muted-foreground underline hover:text-foreground">
            {purchaseFormOpen ? "閉じる" : "+ 購入リンクを追加"}
          </button>
          {purchaseFormOpen && (
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://..."
                value={purchaseUrl}
                onChange={(e) => setPurchaseUrl(e.target.value)}
              />
              <button
                onClick={addPurchaseLink}
                disabled={purchaseBusy || !purchaseUrl.trim()}
                className="h-7 shrink-0 rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
              >
                追加
              </button>
            </div>
          )}
          {purchaseError && <p className="mt-1 text-[11px] text-destructive">{purchaseError}</p>}
        </section>

        <section className="border-t border-border pt-4">
          <SectionHeader label="MISSING" />
          <MissingInformation
            facets={card.missingFacets}
            onAction={(f) => {
              setOfficialPanelOpen(f === "official")
              setDomesticPanelOpen(f === "domestic")
              setImageFinderOpen(f === "image")
              setPurchaseFormOpen(f === "purchase")
            }}
          />
        </section>

        {product.blockReasons.length > 0 && (
          <section className="border-t border-border pt-4">
            <SectionHeader label="BLOCK REASONS" />
            <ul className="space-y-1">
              {product.blockReasons.map((r) => (
                <li key={r} className="text-[11px] text-destructive">
                  {r}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="border-t border-border bg-card p-4">
        {actionError && <p className="mb-2 text-[11px] text-destructive">{actionError}</p>}
        <div className="flex flex-wrap gap-2">
          {product.tier === "CONFIRMED" && (
            <button
              onClick={handleDraft}
              disabled={actionBusy}
              className="h-9 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              記事候補を見る
            </button>
          )}
          <button onClick={handleHold} disabled={actionBusy} className="h-9 rounded-full border border-border px-4 text-xs font-semibold hover:bg-secondary disabled:opacity-50">
            保留
          </button>
          <button onClick={handleIgnore} disabled={actionBusy} className="h-9 rounded-full border border-border px-4 text-xs font-semibold hover:bg-secondary disabled:opacity-50">
            無視
          </button>
        </div>
      </div>
    </div>
  )
}
