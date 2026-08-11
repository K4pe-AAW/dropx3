"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { ConfidenceTier } from "@/lib/source-watch/types"
import { QUICK_FILTER_LABEL, type AdvancedFilters, type QuickFilterKey, type Tab } from "./filters"

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "READY", label: "READY" },
  { key: "REVIEW", label: "REVIEW" },
  { key: "HOLD", label: "HOLD" },
]
const QUICK_KEYS: QuickFilterKey[] = ["noImage", "imageReview", "domesticYes", "domesticNo", "noPurchaseLink", "officialConfirmed", "addedToday"]
const TIERS: ConfidenceTier[] = ["CONFIRMED", "REPORTED", "RUMOR"]

const selectClass = "h-8 rounded-md border border-border px-2 text-xs outline-none focus:ring-2 focus:ring-ring bg-background"

export function FilterBar({
  tab,
  onTabChange,
  tabCounts,
  activeQuick,
  onToggleQuick,
  advanced,
  onAdvancedChange,
  brandOptions,
  sourceOptions,
}: {
  tab: Tab
  onTabChange: (tab: Tab) => void
  tabCounts: Record<Tab, number>
  activeQuick: Set<QuickFilterKey>
  onToggleQuick: (key: QuickFilterKey) => void
  advanced: AdvancedFilters
  onAdvancedChange: (patch: Partial<AdvancedFilters>) => void
  brandOptions: string[]
  sourceOptions: string[]
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const advancedActive = Boolean(advanced.tier || advanced.brand || advanced.source || advanced.minScore)

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={cn(
              "h-9 px-4 rounded-full text-sm font-bold transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label} <span className="opacity-60 font-normal">{tabCounts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {QUICK_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => onToggleQuick(key)}
            className={cn(
              "h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors",
              activeQuick.has(key) ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {QUICK_FILTER_LABEL[key]}
          </button>
        ))}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={cn(
            "h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors",
            advancedActive ? "border-foreground text-foreground" : "border-dashed border-border text-muted-foreground hover:bg-secondary"
          )}
        >
          詳細フィルター{advancedActive ? " ●" : ""}
        </button>
      </div>

      {showAdvanced && (
        <div className="mt-2.5 flex flex-wrap gap-2 rounded-lg border border-border bg-secondary/40 p-2.5">
          <select className={selectClass} value={advanced.tier} onChange={(e) => onAdvancedChange({ tier: e.target.value as ConfidenceTier | "" })}>
            <option value="">確度:すべて</option>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select className={selectClass} value={advanced.brand} onChange={(e) => onAdvancedChange({ brand: e.target.value })}>
            <option value="">ブランド:すべて</option>
            {brandOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select className={selectClass} value={advanced.source} onChange={(e) => onAdvancedChange({ source: e.target.value })}>
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
            className={`${selectClass} w-28`}
            value={advanced.minScore}
            onChange={(e) => onAdvancedChange({ minScore: e.target.value })}
          />
          {advancedActive && (
            <button
              onClick={() => onAdvancedChange({ tier: "", brand: "", source: "", minScore: "" })}
              className="h-8 px-2 text-[11px] text-muted-foreground underline hover:text-foreground"
            >
              クリア
            </button>
          )}
        </div>
      )}
    </div>
  )
}
