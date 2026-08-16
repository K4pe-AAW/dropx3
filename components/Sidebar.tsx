import Link from "next/link"
import { Article } from "@/lib/types"
import { PopularList } from "@/components/PopularList"
import { ChevronDownIcon } from "@/components/icons"
import { TrackedLink } from "@/components/TrackedLink"
import { AdUnit } from "@/components/AdUnit"

const SIDEBAR_AD_SLOT = "1676093020"

export function Sidebar({
  popular,
  brands,
  archive,
}: {
  popular: Article[]
  brands: { name: string; count: number }[]
  archive: { key: string; label: string; count: number }[]
}) {
  return (
    <aside className="space-y-8">
      {popular.length > 0 && (
        <div className="rounded-xl border border-border p-5">
          <PopularList articles={popular} />
        </div>
      )}

      <div>
        <p className="text-center text-[10px] tracking-widest text-muted-foreground/60 mb-2">SPONSORED</p>
        <AdUnit slot={SIDEBAR_AD_SLOT} />
      </div>

      {brands.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none select-none items-center justify-between text-sm font-bold marker:content-none">
            ブランドで探す
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {brands.slice(0, 40).map((b) => (
              <TrackedLink key={b.name} event="brand_select" params={{ brand: b.name, placement: "sidebar" }}>
                <Link
                  href={`/brand/${encodeURIComponent(b.name)}`}
                  className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-secondary transition-colors"
                >
                  {b.name}
                </Link>
              </TrackedLink>
            ))}
          </div>
        </details>
      )}

      {archive.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none select-none items-center justify-between text-sm font-bold marker:content-none">
            アーカイブ
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-3 space-y-1.5">
            {archive.map((m) => (
              <li key={m.key}>
                <Link
                  href={`/archive/${m.key}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {m.label} ({m.count})
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </aside>
  )
}
