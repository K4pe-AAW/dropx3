import type { ConfidenceTier, ProductReadiness } from "@/lib/source-watch/types"
import type { ImageStatusSummary } from "@/lib/source-watch/present"
import type { ImageQualityGrade } from "@/lib/source-watch/image-quality"
import { SOURCE_CATEGORY_SHORT_LABEL } from "@/lib/source-watch/labels"
import type { SourceCategory } from "@/lib/source-watch/types"
import { cn } from "@/lib/utils"

/** READY/REVIEW/HOLD。状態は色だけでなくドット+文字の両方で伝える(文字を読まなくても認識できるように) */
const READINESS_STYLE: Record<ProductReadiness, string> = {
  READY: "text-emerald-700 bg-emerald-50",
  REVIEW: "text-amber-700 bg-amber-50",
  HOLD: "text-muted-foreground bg-secondary",
}
const READINESS_DOT: Record<ProductReadiness, string> = {
  READY: "bg-emerald-600",
  REVIEW: "bg-amber-600",
  HOLD: "bg-muted-foreground/50",
}

export function ReadinessBadge({ readiness, score, className }: { readiness: ProductReadiness; score?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide", READINESS_STYLE[readiness], className)}>
      <span className={cn("size-1.5 rounded-full", READINESS_DOT[readiness])} />
      {readiness}
      {typeof score === "number" && <span className="font-normal opacity-70">{score}</span>}
    </span>
  )
}

const TIER_STYLE: Record<ConfidenceTier, string> = {
  CONFIRMED: "bg-primary text-primary-foreground",
  REPORTED: "bg-accent text-accent-foreground",
  RUMOR: "border border-dashed border-border text-muted-foreground",
}

export function TierBadge({ tier, className }: { tier: ConfidenceTier; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide", TIER_STYLE[tier], className)}>{tier}</span>
}

export function SourceTypeBadge({ category, className }: { category: SourceCategory | null; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-muted-foreground", className)}>
      {category ? SOURCE_CATEGORY_SHORT_LABEL[category] : "UNKNOWN"}
    </span>
  )
}

const IMAGE_STATUS_LABEL: Record<ImageStatusSummary["level"], string> = {
  usable: "✓ 使用可能",
  embed_only: "Embedのみ",
  review: "△ 確認必要",
  unusable: "× 使用不可",
  none: "画像なし",
}
const IMAGE_STATUS_STYLE: Record<ImageStatusSummary["level"], string> = {
  usable: "text-emerald-700 bg-emerald-50",
  embed_only: "text-muted-foreground bg-secondary",
  review: "text-amber-700 bg-amber-50",
  unusable: "text-destructive bg-destructive/10",
  none: "text-muted-foreground/70 bg-secondary/60",
}

export function ImageStatusChip({ level, className }: { level: ImageStatusSummary["level"]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold", IMAGE_STATUS_STYLE[level], className)}>
      {IMAGE_STATUS_LABEL[level]}
    </span>
  )
}

const GRADE_STYLE: Record<ImageQualityGrade, string> = {
  A: "text-emerald-700 border-emerald-300",
  B: "text-foreground/80 border-border",
  C: "text-muted-foreground border-border",
  D: "text-muted-foreground/60 border-border",
}

export function QualityGradeBadge({ grade, className }: { grade: ImageQualityGrade | null; className?: string }) {
  if (!grade) {
    return <span className={cn("inline-flex size-5 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground/50", className)}>-</span>
  }
  return (
    <span className={cn("inline-flex size-5 items-center justify-center rounded border font-mono text-[11px] font-bold", GRADE_STYLE[grade], className)}>
      {grade}
    </span>
  )
}
