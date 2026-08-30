"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { ProductCard } from "@/lib/source-watch/present"
import { QUICK_FILTER_PREDICATES, isToday, type QuickFilterKey, type Tab } from "./filters"

type Stat = {
  key: string
  label: string
  value: number
  onClick: () => void
}

export function SummaryBar({
  cards,
  onSelectTab,
  onSelectQuick,
}: {
  cards: ProductCard[]
  onSelectTab: (tab: Tab) => void
  onSelectQuick: (key: QuickFilterKey) => void
}) {
  const stats: Stat[] = useMemo(() => {
    const count = (pred: (c: ProductCard) => boolean) => cards.filter(pred).length
    return [
      { key: "all", label: "総件数", value: cards.length, onClick: () => onSelectTab("all") },
      {
        key: "confirmed",
        label: "記事化できる",
        value: count((c) => c.product.tier === "CONFIRMED"),
        onClick: () => onSelectQuick("officialConfirmed"),
      },
      { key: "READY", label: "READY", value: count((c) => c.product.readiness === "READY"), onClick: () => onSelectTab("READY") },
      { key: "REVIEW", label: "REVIEW", value: count((c) => c.product.readiness === "REVIEW"), onClick: () => onSelectTab("REVIEW") },
      { key: "HOLD", label: "HOLD", value: count((c) => c.product.readiness === "HOLD"), onClick: () => onSelectTab("HOLD") },
      { key: "noImage", label: "画像なし", value: count(QUICK_FILTER_PREDICATES.noImage), onClick: () => onSelectQuick("noImage") },
      { key: "noPurchaseLink", label: "購入リンクなし", value: count(QUICK_FILTER_PREDICATES.noPurchaseLink), onClick: () => onSelectQuick("noPurchaseLink") },
      { key: "domesticNo", label: "日本発売未確認", value: count(QUICK_FILTER_PREDICATES.domesticNo), onClick: () => onSelectQuick("domesticNo") },
      { key: "today", label: "今日検出", value: count((c) => isToday(c.product.firstDetectedAt)), onClick: () => onSelectQuick("addedToday") },
    ]
  }, [cards, onSelectTab, onSelectQuick])

  return (
    <div>
      <div className="grid grid-cols-4 sm:grid-cols-9 gap-px bg-border border border-border rounded-xl overflow-hidden mb-1.5">
        {stats.map((s) => (
          <button
            key={s.key}
            onClick={s.onClick}
            className={cn("bg-card px-3 py-2.5 text-left hover:bg-secondary transition-colors", s.key === "confirmed" && "bg-accent/25")}
          >
            <p className="text-lg font-black leading-none tabular-nums">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">{s.label}</p>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mb-5">
        CONFIRMED/REPORTED/RUMORは情報の確度です。RUMORも記事候補にできますが、公開面では未確認ラベルと注意文を表示します。READY/REVIEW/HOLDは画像・購入リンク等の材料と確実NG条件の判定です。
      </p>
    </div>
  )
}
