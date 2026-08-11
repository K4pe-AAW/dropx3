/**
 * 利用可能な商品画像が無い場合に表示するプレースホルダー。
 * 禁止事項: 実物の商品をAIで想像して描かない/実際の商品写真に見える画像を生成しない。
 * そのため画像生成は一切行わず、確定している情報だけを並べた記事用情報グラフィック(テキストのみ)として実装する。
 */
export function EditorialPlaceholder({
  brand,
  productName,
  styleCode,
  releaseDate,
  className = "",
}: {
  brand?: string | null
  productName?: string | null
  styleCode?: string | null
  releaseDate?: string | null
  className?: string
}) {
  return (
    <div
      className={`flex aspect-square flex-col items-center justify-center gap-2 border border-dashed border-border bg-secondary/40 px-6 text-center ${className}`}
    >
      <p className="text-[10px] font-bold tracking-widest text-muted-foreground/60">PRODUCT IMAGE</p>
      <p className="text-[10px] font-bold tracking-widest text-muted-foreground/60 -mt-2">COMING SOON</p>
      <div className="mt-3 space-y-1">
        {brand && <p className="text-sm font-black uppercase tracking-wide text-foreground">{brand}</p>}
        {productName && <p className="text-xs font-bold text-foreground/80">{productName}</p>}
        {styleCode && (
          <p className="font-mono text-[11px] text-muted-foreground">
            STYLE CODE <span className="text-foreground/70">{styleCode}</span>
          </p>
        )}
        {releaseDate && (
          <p className="font-mono text-[11px] text-muted-foreground">
            RELEASE <span className="text-foreground/70">{releaseDate}</span>
          </p>
        )}
      </div>
    </div>
  )
}
