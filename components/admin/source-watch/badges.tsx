import type { ConfidenceTier, ProductReadiness, SaleMethod, SocialSourceType } from "@/lib/source-watch/types"
import type { ImageStatusSummary } from "@/lib/source-watch/present"
import type { ImageQualityGrade } from "@/lib/source-watch/image-quality"
import { LOTTERY_LIKE_SALE_METHODS, SALE_METHOD_LABEL, SOCIAL_SOURCE_TYPE_SHORT_LABEL, SOURCE_CATEGORY_SHORT_LABEL } from "@/lib/source-watch/labels"
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

const READINESS_HINT: Record<ProductReadiness, string> = {
  READY: "記事の材料(画像・購入リンク等)がほぼ揃っている(80点以上)",
  REVIEW: "記事の材料が一部不足している(60〜79点)",
  HOLD: "記事の材料が大きく不足しているか、ブロック条件に該当(59点以下)。ただし確度がCONFIRMEDなら記事化ボタン自体は使える",
}

export function ReadinessBadge({ readiness, score, className }: { readiness: ProductReadiness; score?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide", READINESS_STYLE[readiness], className)}
      title={`完成度: ${READINESS_HINT[readiness]}`}
    >
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

const TIER_HINT: Record<ConfidenceTier, string> = {
  CONFIRMED: "確度: 公式・国内正規販売店で確認済み。記事化(下書き生成)できる状態",
  REPORTED: "確度: 公式未確認だが、複数の信頼できる情報源が報じている。記事化ボタンはまだ出ない",
  RUMOR: "確度: 単一の早期情報・SNSのみ。記事化ボタンはまだ出ない",
}

export function TierBadge({ tier, className }: { tier: ConfidenceTier; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide", TIER_STYLE[tier], className)} title={TIER_HINT[tier]}>
      {tier}
    </span>
  )
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

/** SOCIAL WATCHのアカウント種別バッジ(OFFICIAL BRAND/ARTIST/EVENT/STORE/MEDIA/COLLECTOR) */
export function SocialSourceTypeBadge({ socialType, className }: { socialType: SocialSourceType | undefined; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-muted-foreground", className)}>
      {socialType ? SOCIAL_SOURCE_TYPE_SHORT_LABEL[socialType] : "UNKNOWN"}
    </span>
  )
}

/** 抽選系(lottery/web_lottery/store_lottery/entry_lottery)は目立たせる */
export function SaleMethodBadge({ saleMethod, className }: { saleMethod: SaleMethod; className?: string }) {
  const isLottery = LOTTERY_LIKE_SALE_METHODS.includes(saleMethod)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide",
        isLottery ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground/80",
        className
      )}
    >
      {SALE_METHOD_LABEL[saleMethod]}
    </span>
  )
}
