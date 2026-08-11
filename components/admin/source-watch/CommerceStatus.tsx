import { cn } from "@/lib/utils"
import { PURCHASE_LINK_KIND_LABEL } from "@/lib/source-watch/labels"
import type { PurchaseLinkCandidate } from "@/lib/source-watch/types"

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function CommerceStatus({ candidates }: { candidates: PurchaseLinkCandidate[] }) {
  if (candidates.length === 0) {
    return <p className="text-[11px] text-muted-foreground">購入リンクなし</p>
  }
  return (
    <ul className="space-y-1.5">
      {candidates.map((c) => (
        <li key={c.url} className="flex items-center justify-between gap-2 text-[11px]">
          <a href={c.url} target="_blank" rel="noopener noreferrer" className="truncate font-mono text-foreground/80 hover:underline">
            {hostnameOf(c.url)}
          </a>
          <span className={cn("shrink-0 font-semibold whitespace-nowrap", c.isBrandTopOnly ? "text-muted-foreground/60" : "text-emerald-700")}>
            {c.isBrandTopOnly ? "△ " : "✓ "}
            {PURCHASE_LINK_KIND_LABEL[c.kind]}
          </span>
        </li>
      ))}
    </ul>
  )
}
