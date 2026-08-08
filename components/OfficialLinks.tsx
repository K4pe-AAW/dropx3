import { OfficialLink } from "@/lib/types"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ExternalLinkIcon } from "@/components/icons"

/**
 * ブランド/店舗の公式サイトへの直リンク。紹介料は発生しないためAffiliateCTAとは別枠で、
 * "PR"表記や広告開示文言は付けない（付けると実際にはない紹介料関係があるかのように誤解させるため）。
 */
export function OfficialLinks({ links }: { links: OfficialLink[] }) {
  const safeLinks = links.filter((l) => isSafeExternalUrl(l.url))
  if (safeLinks.length === 0) return null

  return (
    <div className="my-6 flex flex-wrap gap-2.5">
      {safeLinks.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "md" }))}
        >
          {link.label}
          <ExternalLinkIcon className="size-4 shrink-0" />
        </a>
      ))}
    </div>
  )
}
