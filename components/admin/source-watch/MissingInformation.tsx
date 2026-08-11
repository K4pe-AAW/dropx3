import type { MissingFacet } from "@/lib/source-watch/present"
import { MISSING_FACET_ACTION_LABEL, MISSING_FACET_LABEL, type FocusTarget } from "./missing-actions"

/** カード内(compact)とInspector内(full)の両方で使う。クリックで該当アクションへ遷移する */
export function MissingInformation({
  facets,
  onAction,
  compact = false,
}: {
  facets: MissingFacet[]
  onAction: (facet: FocusTarget) => void
  compact?: boolean
}) {
  if (facets.length === 0) {
    return <p className="text-[11px] font-semibold text-emerald-700">✓ 不足なし</p>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {facets.map((f) => (
        <button
          key={f}
          onClick={(e) => {
            e.stopPropagation()
            onAction(f)
          }}
          className="h-6 rounded-full border border-dashed border-border px-2 text-[10px] font-semibold text-muted-foreground hover:border-foreground hover:text-foreground"
        >
          + {compact ? MISSING_FACET_LABEL[f] : MISSING_FACET_ACTION_LABEL[f]}
        </button>
      ))}
    </div>
  )
}
