import { cn } from "@/lib/utils"
import type { ProductCard } from "@/lib/source-watch/present"

type StepState = "done" | "partial" | "pending" | "missing"

const STEP_STYLE: Record<StepState, string> = {
  done: "bg-emerald-600 text-white",
  partial: "bg-amber-500 text-white",
  pending: "border border-dashed border-border text-muted-foreground/50",
  missing: "bg-secondary text-muted-foreground/70 border border-border",
}
const STEP_ICON: Record<StepState, string> = { done: "✓", partial: "△", pending: "○", missing: "×" }

function buildSteps(card: ProductCard): { label: string; state: StepState; hint: string }[] {
  const imageState: StepState =
    card.imageStatus.level === "usable" ? "done" : card.imageStatus.level === "review" || card.imageStatus.level === "embed_only" ? "partial" : "missing"
  return [
    { label: "SOURCE", state: card.sourceLinks.length > 0 ? "done" : "missing", hint: "情報源から検出されているか" },
    {
      label: "OFFICIAL",
      state: card.product.officialConfirmed ? "done" : "missing",
      hint: "ブランド公式または国内正規販売店で確認済みか(これがYESだと確度CONFIRMED=記事化できる状態になる)",
    },
    { label: "JAPAN", state: card.product.domesticConfirmed ? "done" : "missing", hint: "国内発売が確認できているか(海外発売日だけではYESにならない)" },
    { label: "IMAGE", state: imageState, hint: "使用可能な画像があるか(△は権利確認が必要な画像のみある状態)" },
    { label: "BUY", state: card.hasNonBrandTopPurchaseLink ? "done" : "missing", hint: "商品ページ等、具体的な購入リンクがあるか" },
    { label: "ARTICLE", state: card.product.draftId ? "done" : "pending", hint: "この候補から下書きを既に生成したか" },
  ]
}

export function ProductPipeline({ card, className }: { card: ProductCard; className?: string }) {
  const steps = buildSteps(card)
  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center">
          {i > 0 && <div className="h-px w-2.5 bg-border shrink-0" />}
          <div className="flex flex-col items-center gap-1 px-0.5" title={`${s.label}: ${s.hint}`}>
            <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0", STEP_STYLE[s.state])}>
              {STEP_ICON[s.state]}
            </span>
            <span className="text-[8px] font-semibold tracking-wide text-muted-foreground whitespace-nowrap">{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
