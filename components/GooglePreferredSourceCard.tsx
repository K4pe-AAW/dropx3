"use client"

import Script from "next/script"
import { trackEvent } from "@/lib/analytics"

export function GooglePreferredSourceCard({
  placement,
  compact = false,
}: {
  placement: "home" | "article_end"
  compact?: boolean
}) {
  const preferredSourceAttribute = { "google-add-preferred-source-btn": "" }

  if (compact) {
    return (
      <aside className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Script async src="https://news.google.com/swg/js/v1/publisher.js" strategy="afterInteractive" />
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-[0.18em] text-muted-foreground">FOLLOW ON GOOGLE</p>
          <p className="mt-0.5 text-sm font-bold">GoogleでDROPの新着をフォロー</p>
        </div>
        <div
          className="min-h-10 shrink-0 sm:min-w-52"
          onClickCapture={() => trackEvent("preferred_source_click", { placement })}
          {...preferredSourceAttribute}
        />
      </aside>
    )
  }

  return (
    <aside className="mt-6 rounded-xl border border-border bg-secondary/30 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
      <Script async src="https://news.google.com/swg/js/v1/publisher.js" strategy="afterInteractive" />
      <div>
        <p className="text-[10px] font-black tracking-[0.18em] text-muted-foreground">FOLLOW ON GOOGLE</p>
        <p className="mt-1 text-sm font-bold">GoogleでDROPの新着をフォロー</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">優先ソースに追加すると、新着を見つけやすくなります。</p>
      </div>
      <div
        className="mt-3 min-h-10 shrink-0 sm:mt-0 sm:min-w-52"
        onClickCapture={() => trackEvent("preferred_source_click", { placement })}
        {...preferredSourceAttribute}
      />
    </aside>
  )
}
