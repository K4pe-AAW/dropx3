import type { ColorwayInfo } from "@/lib/types"
import { EditorialPlaceholder } from "@/components/EditorialPlaceholder"

/**
 * カラー展開ごとの商品スペックカード。UPTODATE等の競合メディアの商品カード表示を参考に、
 * 画像+ラベル付きスペック(型番・価格・サイズ・発売日・取扱店)を色ごとに並べる。
 */
export function ColorwaySection({ colorways, productName }: { colorways: ColorwayInfo[]; productName: string }) {
  if (colorways.length === 0) return null

  return (
    <div className="my-8">
      <h2 className="text-sm font-bold mb-3">カラーバリエーション</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {colorways.map((cw, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border">
            {cw.image ? (
              <div className="relative aspect-square bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cw.image}
                  alt={`${productName} ${cw.colorName}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <EditorialPlaceholder productName={productName} styleCode={cw.styleCode} releaseDate={cw.releaseDate} />
            )}
            <div className="space-y-1.5 bg-secondary/40 px-4 py-3 text-xs">
              <p className="mb-1.5 text-sm font-bold text-foreground">{productName}</p>
              <SpecRow label="カラー" value={cw.colorName} />
              {cw.styleCode && <SpecRow label="スタイルコード" value={cw.styleCode} />}
              {cw.price && <SpecRow label="販売価格" value={cw.price} />}
              {cw.size && <SpecRow label="サイズ" value={cw.size} />}
              {cw.releaseDate && <SpecRow label="発売予定日" value={cw.releaseDate} />}
              {cw.retailers && cw.retailers.length > 0 && <SpecRow label="取扱店" value={cw.retailers.join("、")} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-muted-foreground">
      <span className="text-foreground/70">{label}</span>: {value}
    </p>
  )
}
