import { cn } from "@/lib/utils"

/**
 * フッター直前の広告枠プレースホルダー。実際の広告タグ(AdSense等)は未接続のため、
 * 枠だけ確保した状態。実運用時はこの中身を広告ネットワークのタグに差し替える。
 * 2枠を横並びで幅比2:1にしている。
 */
export function AdSlot() {
  return (
    <div className="relative z-10 w-full max-w-[1200px] mx-auto bg-background px-4 py-6">
      <div className="flex flex-row gap-4">
        <AdBox className="flex-[2]" />
        <AdBox className="flex-[1]" />
      </div>
    </div>
  )
}

function AdBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex min-h-[100px] items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 sm:min-h-[120px]",
        className
      )}
    >
      <span className="absolute left-3 top-2 text-[10px] font-bold tracking-wide text-muted-foreground/50">
        AD
      </span>
      <span className="text-xs text-muted-foreground/60">広告スペース</span>
    </div>
  )
}
