import { AffiliateLink } from "@/lib/types"
import { AFFILIATE_REL, sanitizeAffiliateLinks } from "@/lib/affiliate"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { siteConfig } from "@/lib/site-config"
import { cn } from "@/lib/utils"
import { ExternalLinkIcon } from "@/components/icons"

export function AffiliateCTA({ links }: { links: AffiliateLink[] }) {
  const safeLinks = sanitizeAffiliateLinks(links)
  if (safeLinks.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-5 my-6">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="pr">PR</Badge>
        <p className="text-xs text-muted-foreground">
          広告を含みます。購入・申込によって{siteConfig.name}に紹介料が入る場合があります。
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {safeLinks.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel={AFFILIATE_REL}
            className={cn(buttonVariants({ variant: "accent", size: "lg" }), "w-full justify-between h-auto py-3")}
          >
            <span className="flex flex-col items-start text-left">
              <span>{link.label}</span>
              {(link.price || link.retailer) && (
                <span className="text-xs font-normal opacity-80">
                  {[link.price, link.retailer].filter(Boolean).join(" ・ ")}
                </span>
              )}
            </span>
            <ExternalLinkIcon className="size-4 shrink-0" />
          </a>
        ))}
      </div>
    </div>
  )
}
