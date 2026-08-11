"use client"

import type { ProductCard } from "@/lib/source-watch/present"
import { MISSING_FACET_ACTION_LABEL, MISSING_FACET_LABEL, type FocusTarget } from "./missing-actions"

const QUEUE_SIZE = 5

export function SmartQueue({ cards, onOpen }: { cards: ProductCard[]; onOpen: (productId: string, focus?: FocusTarget) => void }) {
  const items = cards.slice(0, QUEUE_SIZE)
  if (items.length === 0) return null

  return (
    <section className="mb-5 rounded-xl border border-border bg-card p-4">
      <h2 className="text-xs font-bold mb-3">今やるべき{items.length}件</h2>
      <ol className="space-y-1">
        {items.map((c, i) => {
          const title = [c.product.brand, c.product.productName].filter(Boolean).join(" ") || "商品名未確認"
          const facet = c.missingFacets[0]
          const extra = c.missingFacets.length > 1 ? `+他${c.missingFacets.length - 1}項目` : ""
          return (
            <li key={c.product.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-secondary/60">
              <button onClick={() => onOpen(c.product.id, facet)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="w-4 shrink-0 font-mono text-xs tabular-nums text-muted-foreground/50">{i + 1}</span>
                <span className="truncate text-sm font-semibold">{title}</span>
                <span className="shrink-0 truncate text-[11px] text-muted-foreground">
                  {facet ? `${MISSING_FACET_LABEL[facet]}だけ不足${extra}` : "すべて確認済み"}
                </span>
              </button>
              <button
                onClick={() => onOpen(c.product.id, facet)}
                className="h-7 shrink-0 rounded-full border border-border px-3 text-[11px] font-semibold hover:bg-secondary"
              >
                {facet ? MISSING_FACET_ACTION_LABEL[facet] : "記事候補を見る"}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
