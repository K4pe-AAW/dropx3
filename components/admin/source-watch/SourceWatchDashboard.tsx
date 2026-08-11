"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { ProductCard as ProductCardData } from "@/lib/source-watch/present"
import { SummaryBar } from "./SummaryBar"
import { SmartQueue } from "./SmartQueue"
import { FilterBar } from "./FilterBar"
import { ProductCard } from "./ProductCard"
import { BulkActionBar } from "./BulkActionBar"
import { SourceInspector } from "./SourceInspector"
import type { FocusTarget } from "./missing-actions"
import { applyAdvancedFilters, applyQuickFilters, applyTab, EMPTY_ADVANCED, type AdvancedFilters, type QuickFilterKey, type Tab } from "./filters"

/**
 * SOURCE WATCHの編集デスク本体。カード一覧はサーバー(sortCardsByPriority)で優先順に並べ済みのものを
 * initialCardsとして受け取り、以降のタブ/フィルタ切り替えは全てクライアント側の絞り込みだけで行う
 * (Array.filterは順序を保つため、優先順位は絞り込み後も崩れない。API再取得を挟まないことで
 * Blobの書き込み伝播遅延の影響を受けず、タブ切替が即時に反応する)。
 */
export function SourceWatchDashboard({ initialCards }: { initialCards: ProductCardData[] }) {
  const [cards, setCards] = useState(initialCards)
  const [tab, setTab] = useState<Tab>("all")
  const [activeQuick, setActiveQuick] = useState<Set<QuickFilterKey>>(new Set())
  const [advanced, setAdvanced] = useState<AdvancedFilters>(EMPTY_ADVANCED)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [inspector, setInspector] = useState<{ id: string; focus?: FocusTarget } | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  const brandOptions = useMemo(() => [...new Set(cards.map((c) => c.product.brand).filter((b): b is string => Boolean(b)))].sort(), [cards])
  const sourceOptions = useMemo(() => [...new Set(cards.flatMap((c) => c.sourceNames))].sort(), [cards])

  const quickAndAdvancedFiltered = useMemo(() => applyAdvancedFilters(applyQuickFilters(cards, activeQuick), advanced), [cards, activeQuick, advanced])
  const visibleCards = useMemo(() => applyTab(quickAndAdvancedFiltered, tab), [quickAndAdvancedFiltered, tab])

  const tabCounts: Record<Tab, number> = useMemo(
    () => ({
      all: quickAndAdvancedFiltered.length,
      READY: quickAndAdvancedFiltered.filter((c) => c.product.readiness === "READY").length,
      REVIEW: quickAndAdvancedFiltered.filter((c) => c.product.readiness === "REVIEW").length,
      HOLD: quickAndAdvancedFiltered.filter((c) => c.product.readiness === "HOLD").length,
    }),
    [quickAndAdvancedFiltered]
  )

  const queueCards = useMemo(() => cards.filter((c) => !c.product.draftId), [cards])

  function openInspector(id: string, focus?: FocusTarget) {
    setInspector({ id, focus })
  }
  function closeInspector() {
    setInspector(null)
  }
  function patchCard(updated: ProductCardData) {
    setCards((prev) => prev.map((c) => (c.product.id === updated.product.id ? updated : c)))
  }
  function removeCard(productId: string) {
    setCards((prev) => prev.filter((c) => c.product.id !== productId))
    setSelectedIds((prev) => {
      if (!prev.has(productId)) return prev
      const next = new Set(prev)
      next.delete(productId)
      return next
    })
    setInspector((prev) => (prev?.id === productId ? null : prev))
  }
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkAction(action: "ignore" | "hold" | "unhold") {
    if (selectedIds.size === 0) return
    setBulkBusy(true)
    try {
      const ids = [...selectedIds]
      const res = await fetch("/api/admin/source-watch/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (action === "unhold") {
        setCards((prev) => prev.map((c) => (ids.includes(c.product.id) ? { ...c, product: { ...c.product, reviewStatus: "pending" } } : c)))
      } else {
        setCards((prev) => prev.filter((c) => !ids.includes(c.product.id)))
        setInspector((prev) => (prev && ids.includes(prev.id) ? null : prev))
      }
      setSelectedIds(new Set())
    } catch {
      // 失敗時は選択状態を保持したままにする(再試行できるように)
    } finally {
      setBulkBusy(false)
    }
  }

  const inspectorCard = inspector ? (cards.find((c) => c.product.id === inspector.id) ?? null) : null

  return (
    <div>
      <SummaryBar
        cards={cards}
        onSelectTab={(t) => {
          setTab(t)
          setActiveQuick(new Set())
        }}
        onSelectQuick={(key) => {
          setTab("all")
          setActiveQuick(new Set([key]))
        }}
      />

      <SmartQueue cards={queueCards} onOpen={openInspector} />

      <BulkActionBar
        count={selectedIds.size}
        busy={bulkBusy}
        onHold={() => bulkAction("hold")}
        onUnhold={() => bulkAction("unhold")}
        onIgnore={() => bulkAction("ignore")}
        onClear={() => setSelectedIds(new Set())}
      />

      <FilterBar
        tab={tab}
        onTabChange={setTab}
        tabCounts={tabCounts}
        activeQuick={activeQuick}
        onToggleQuick={(key) =>
          setActiveQuick((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
          })
        }
        advanced={advanced}
        onAdvancedChange={(patch) => setAdvanced((prev) => ({ ...prev, ...patch }))}
        brandOptions={brandOptions}
        sourceOptions={sourceOptions}
      />

      <div className={cn("lg:grid lg:items-start lg:gap-5", inspectorCard ? "lg:grid-cols-[1fr_380px]" : "lg:grid-cols-1")}>
        <div>
          {visibleCards.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {cards.length === 0 ? "まだ商品候補がありません。情報源の巡回結果を待つか、情報源管理から巡回を実行してください。" : "条件に合う候補はありません。"}
            </p>
          ) : (
            <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", inspectorCard ? "" : "lg:grid-cols-3 xl:grid-cols-4")}>
              {visibleCards.map((c) => (
                <ProductCard key={c.product.id} card={c} selected={selectedIds.has(c.product.id)} onToggleSelect={toggleSelect} onOpen={openInspector} />
              ))}
            </div>
          )}
        </div>

        {inspectorCard && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-background lg:sticky lg:top-4 lg:z-auto lg:max-h-[calc(100vh-2rem)] lg:rounded-xl lg:border lg:border-border lg:bg-card">
            <SourceInspector
              key={`${inspectorCard.product.id}:${inspector?.focus ?? ""}`}
              card={inspectorCard}
              focus={inspector?.focus}
              onClose={closeInspector}
              onCardUpdated={patchCard}
              onRemoved={removeCard}
            />
          </div>
        )}
      </div>
    </div>
  )
}
