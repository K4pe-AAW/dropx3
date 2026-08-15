"use client"

import type { PurchaseChannelInfo } from "@/lib/types"
import { isSafeExternalUrl } from "@/lib/affiliate"
import { trackEvent, linkDomain } from "@/lib/analytics"

const SALE_METHOD_LABEL: Record<PurchaseChannelInfo["saleMethod"], string> = {
  regular: "通常販売",
  lottery: "抽選",
  unknown: "販売方法未確認",
}

/**
 * FULLRESS等の競合メディアの「取り扱い店舗」ブロックを参考にした、店舗×抽選/通常販売×日程の一覧。
 * ColorwaySectionの色ごとカードとは別に、公式/セレクト店・二次流通を分けて店舗単位で並べる。
 */
export function PurchaseChannelsSection({ channels, articleId }: { channels: PurchaseChannelInfo[]; articleId: string }) {
  if (channels.length === 0) return null

  const official = channels.filter((c) => c.channelType === "official")
  const secondary = channels.filter((c) => c.channelType === "secondary")

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border">
      <div className="bg-accent px-4 py-3">
        <h2 className="text-sm font-bold text-accent-foreground">抽選情報・販売方法</h2>
      </div>
      {official.length > 0 && <ChannelGroup label="公式・正規販売店" channels={official} articleId={articleId} />}
      {secondary.length > 0 && <ChannelGroup label="セレクト店・二次流通" channels={secondary} articleId={articleId} />}
    </div>
  )
}

function ChannelGroup({
  label,
  channels,
  articleId,
}: {
  label: string
  channels: PurchaseChannelInfo[]
  articleId: string
}) {
  return (
    <div>
      <div className="bg-secondary/10 px-4 pt-2 text-[11px] font-bold tracking-wide text-muted-foreground/70">{label}</div>
      <div className="divide-y divide-border">
        {channels.map((c, i) => {
          const url = c.url
          return (
          <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-3">
            {url && isSafeExternalUrl(url) ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent("outbound_click", {
                    link_domain: linkDomain(url),
                    link_url: url,
                    placement: "article_body",
                    article_id: articleId,
                  })
                }
                className="font-bold text-foreground underline decoration-accent decoration-2 underline-offset-2"
              >
                {c.retailerName}
              </a>
            ) : (
              <span className="font-bold text-foreground">{c.retailerName}</span>
            )}
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                c.saleMethod === "lottery" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {SALE_METHOD_LABEL[c.saleMethod]}
            </span>
            {c.date && <span className="text-xs text-muted-foreground">{c.date}</span>}
          </div>
          )
        })}
      </div>
    </div>
  )
}
