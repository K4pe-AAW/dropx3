import { cn } from "@/lib/utils"
import { AdUnit } from "@/components/AdUnit"

const FOOTER_AD_SLOT = "8049929689"

/**
 * フッター直前の広告枠。2枠を横並びで幅比2:1にしている。
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
    <div className={cn("relative min-h-[100px] overflow-hidden rounded-xl sm:min-h-[120px]", className)}>
      <AdUnit slot={FOOTER_AD_SLOT} />
    </div>
  )
}
