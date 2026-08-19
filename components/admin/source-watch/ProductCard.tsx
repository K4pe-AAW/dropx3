import { cn } from "@/lib/utils"
import { EditorialPlaceholder } from "@/components/EditorialPlaceholder"
import type { ProductCard as ProductCardData } from "@/lib/source-watch/present"
import { ReadinessBadge, SourceTypeBadge, TierBadge } from "./badges"
import { MissingInformation } from "./MissingInformation"
import type { FocusTarget } from "./missing-actions"

export function ProductCard({
  card,
  selected,
  onToggleSelect,
  onOpen,
}: {
  card: ProductCardData
  selected: boolean
  onToggleSelect: (id: string) => void
  onOpen: (id: string, focus?: FocusTarget) => void
}) {
  const { product } = card
  const releaseDate = product.colorways.find((c) => c.releaseDate)?.releaseDate ?? null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(product.id)
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md",
        selected ? "border-foreground" : "border-border"
      )}
    >
      <label className="absolute left-2 top-2 z-10 flex size-5 items-center justify-center rounded bg-background/80 backdrop-blur" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(product.id)} className="size-3.5 accent-foreground" />
      </label>

      <div className="relative aspect-[4/3] bg-secondary">
        {card.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- 出典ごとに画像ドメインが異なるためnext/imageのremotePatternsを固定できない
          <img src={card.coverImage.url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <EditorialPlaceholder brand={product.brand} productName={product.productName} styleCode={product.styleCode} releaseDate={releaseDate} className="h-full" />
        )}
        <div className="absolute right-2 top-2">
          <TierBadge tier={product.tier} />
        </div>
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{product.brand ?? "ブランド不明"}</p>
          <ReadinessBadge readiness={product.readiness} score={product.readinessScore} />
        </div>
        <h3 className="text-sm font-black leading-snug line-clamp-2">{product.productName ?? "商品名未確認"}</h3>
        {product.styleCode && <p className="font-mono text-[10px] text-muted-foreground">{product.styleCode}</p>}

        {card.sourceBadges.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {card.sourceBadges.slice(0, 3).map((b) => (
              <SourceTypeBadge key={b.name} category={b.category} />
            ))}
          </div>
        )}

        <MissingInformation facets={card.missingFacets} onAction={(f) => onOpen(product.id, f)} compact />
      </div>
    </div>
  )
}
