import type { OfficialProductLink } from "@/lib/types"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { ExternalLinkIcon } from "@/components/icons"

/**
 * ブランド公式サイトの他の実売商品を写真+商品名+価格でカード表示する(UPTODATE等の競合メディアの
 * 「ブランド公式のおすすめ商品」ウィジェットを参考)。紹介料が発生しない公式サイトへの直リンクなので
 * officialLinksと同じ扱い(PurchaseLinksのアフィリエイト行と違い"PR"表記・sponsored relは付けない)。
 */
export function OfficialProductWidget({ products, brand }: { products: OfficialProductLink[]; brand?: string }) {
  const safe = products.filter((p) => p.name.trim() && p.image.trim() && isSafeExternalUrl(p.url))
  if (safe.length === 0) return null

  const heading = brand ? `${brand}公式のおすすめ商品` : "公式サイトのおすすめ商品"

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border">
      <div className="bg-secondary/40 px-4 py-3">
        <h2 className="text-sm font-bold text-foreground">{heading}</h2>
      </div>
      <div className="divide-y divide-border">
        {safe.map((p, i) => (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
          >
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
              {p.price && <p className="mt-0.5 text-sm font-bold text-foreground">{p.price}</p>}
            </div>
            <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" />
          </a>
        ))}
      </div>
      {brand && (
        <p className="border-t border-border bg-secondary/20 px-4 py-2 text-[11px] text-muted-foreground">
          価格・在庫状況は{brand}公式サイトでご確認ください。
        </p>
      )}
    </div>
  )
}
