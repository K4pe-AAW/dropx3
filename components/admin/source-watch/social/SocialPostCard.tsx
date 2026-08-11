import { cn } from "@/lib/utils"
import type { ProductCard as ProductCardData } from "@/lib/source-watch/present"
import { formatCountdown, formatRelativeTime, isUrgent, pickRelevantDeadline } from "@/lib/source-watch/countdown"
import type { SocialSourceType } from "@/lib/source-watch/types"
import { SaleMethodBadge, SocialSourceTypeBadge, TierBadge } from "../badges"

export function SocialPostCard({
  card,
  sourceSocialType,
  onOpen,
}: {
  card: ProductCardData
  sourceSocialType: SocialSourceType | undefined
  onOpen: (id: string) => void
}) {
  const { product } = card
  const social = product.social
  if (!social) return null

  const title = [product.brand, product.productName ?? social.characterName].filter(Boolean).join(" ") || "商品名未確認"
  const deadline = pickRelevantDeadline(social)
  const entryLink = product.purchaseLinkCandidates.find((c) => c.kind === "official_lottery")
  const hasProductInfo = Boolean(product.productName || social.characterName)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(product.id)
      }}
      className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black">{card.sourceNames[0] ?? "?"}</p>
          <SocialSourceTypeBadge socialType={sourceSocialType} className="mt-1" />
        </div>
        <div className="flex items-center gap-1.5">
          <TierBadge tier={product.tier} />
          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(product.firstDetectedAt)}</span>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <h3 className="mb-1.5 text-sm font-black leading-snug">{title}</h3>
        {social.eventName && <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{social.eventName}</p>}
        {social.saleMethod && <SaleMethodBadge saleMethod={social.saleMethod} className="mb-2" />}

        {(social.entryStartAt || social.entryDeadlineAt) && (
          <div className="mb-2 grid grid-cols-2 gap-2 text-[11px]">
            {social.entryStartAt && (
              <div>
                <p className="text-muted-foreground/70">応募開始</p>
                <p className="font-mono font-semibold">{social.entryStartAt}</p>
              </div>
            )}
            {social.entryDeadlineAt && (
              <div>
                <p className="text-muted-foreground/70">締切</p>
                <p className="font-mono font-semibold">{social.entryDeadlineAt}</p>
              </div>
            )}
          </div>
        )}

        {deadline && (
          <p className={cn("mb-2 text-sm font-bold", isUrgent(deadline.at) ? "text-destructive" : "text-amber-700")}>
            {deadline.label}まで {formatCountdown(deadline.at)}
          </p>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className={hasProductInfo ? "text-emerald-700" : "text-muted-foreground/50"}>商品情報 {hasProductInfo ? "✓" : "×"}</span>
          <span className={entryLink ? "text-emerald-700" : "text-muted-foreground/50"}>応募URL {entryLink ? "✓" : "×"}</span>
          <span className="text-amber-700">IMAGE △ INSTAGRAM原本のみ</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpen(product.id)
            }}
            className="h-7 rounded-full border border-border px-3 text-[11px] font-semibold hover:bg-secondary"
          >
            詳細
          </button>
          {entryLink && (
            <a
              href={entryLink.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="h-7 rounded-full bg-primary px-3 text-[11px] font-semibold leading-7 text-primary-foreground"
            >
              応募ページ確認
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
