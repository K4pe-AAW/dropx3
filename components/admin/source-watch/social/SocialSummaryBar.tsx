"use client"

import type { SocialSummaryStats } from "@/lib/source-watch/social-present"
import type { SocialQuickFilter } from "./filters"

const STATS: { key: SocialQuickFilter | "all"; label: string; value: (s: SocialSummaryStats) => number }[] = [
  { key: "all", label: "総件数", value: (s) => s.total },
  { key: "newToday", label: "新着", value: (s) => s.newToday },
  { key: "raffle", label: "抽選", value: (s) => s.raffle },
  { key: "dueToday", label: "本日締切", value: (s) => s.dueToday },
  { key: "dueThisWeek", label: "今週締切", value: (s) => s.dueThisWeek },
  { key: "release", label: "発売", value: (s) => s.release },
  { key: "restock", label: "再販", value: (s) => s.restock },
  { key: "event", label: "イベント", value: (s) => s.event },
]

export function SocialSummaryBar({ stats, onSelect }: { stats: SocialSummaryStats; onSelect: (key: SocialQuickFilter | "all") => void }) {
  return (
    <div className="mb-5 grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-8">
      {STATS.map((s) => (
        <button key={s.key} onClick={() => onSelect(s.key)} className="bg-card px-3 py-2.5 text-left transition-colors hover:bg-secondary">
          <p className="text-lg font-black leading-none tabular-nums">{s.value(stats)}</p>
          <p className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground">{s.label}</p>
        </button>
      ))}
    </div>
  )
}
