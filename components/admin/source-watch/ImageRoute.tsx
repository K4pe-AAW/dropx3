import { cn } from "@/lib/utils"
import { imageStatusOf, isEmbedOnly, type ImageStatusLevel } from "@/lib/source-watch/image-rights"
import { IMAGE_CATEGORY_BUCKET, IMAGE_CATEGORY_BUCKET_LABEL } from "@/lib/source-watch/labels"
import type { ImageAsset } from "@/lib/source-watch/types"

const VERDICT_STYLE: Record<ImageStatusLevel, { label: string; dot: string; text: string }> = {
  usable: { label: "✓ USE OK", dot: "bg-emerald-600", text: "text-emerald-700" },
  embed_only: { label: "EMBED ONLY", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
  review: { label: "△ 確認必要", dot: "bg-amber-500", text: "text-amber-700" },
  unusable: { label: "× DO NOT USE", dot: "bg-destructive", text: "text-destructive" },
}

function usageClassLabel(asset: Pick<ImageAsset, "sourceType" | "rightsStatus">): string {
  if (asset.sourceType === "editorial_placeholder") return "PLACEHOLDER"
  if (asset.sourceType === "official_social") return "SOCIAL EMBED"
  if (asset.sourceType === "third_party_media") return "THIRD PARTY"
  if (asset.sourceType === "affiliate_asset") return "AFFILIATE"
  if (asset.sourceType === "retailer") return "RETAILER"
  if (isEmbedOnly(asset)) return "EMBED ONLY"
  return "EDITORIAL USE"
}

function RouteNode({ label, isLast, dotClassName, textClassName }: { label: string; isLast?: boolean; dotClassName?: string; textClassName?: string }) {
  return (
    <div className="flex items-stretch gap-2.5">
      <div className="flex w-2 shrink-0 flex-col items-center">
        <span className={cn("size-2 rounded-full shrink-0", dotClassName ?? "bg-border")} />
        {!isLast && <span className="my-0.5 w-px flex-1 bg-border" />}
      </div>
      <span className={cn("pb-3 text-[11px] leading-tight", textClassName ?? "font-semibold text-muted-foreground")}>{label}</span>
    </div>
  )
}

/** 画像候補が「どこから来て、なぜその判定になったか」を縦のタイムラインで見せる */
export function ImageRoute({ asset, publisherName }: { asset: ImageAsset; publisherName: string }) {
  const bucket = asset.sourceType === "editorial_placeholder" ? null : IMAGE_CATEGORY_BUCKET[asset.sourceType]
  const status = imageStatusOf(asset)
  const verdict = VERDICT_STYLE[status]
  const nodeLabels = [bucket ? IMAGE_CATEGORY_BUCKET_LABEL[bucket] : "PLACEHOLDER", publisherName, usageClassLabel(asset)]

  return (
    <div>
      {nodeLabels.map((label, i) => (
        <RouteNode key={i} label={label} />
      ))}
      <RouteNode label={verdict.label} isLast dotClassName={verdict.dot} textClassName={cn("font-bold", verdict.text)} />
    </div>
  )
}
