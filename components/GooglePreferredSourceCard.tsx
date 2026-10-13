"use client"

import Script from "next/script"
import { trackEvent } from "@/lib/analytics"

export function GooglePreferredSourceCard({ placement }: { placement: "home" | "article_end" }) {
  const preferredSourceAttribute = { "google-add-preferred-source-btn": "" }

  return (
    <aside className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 sm:p-6">
      <Script async src="https://news.google.com/swg/js/v1/publisher.js" strategy="afterInteractive" />
      <p className="text-xs font-black tracking-[0.18em]">FOLLOW ON GOOGLE</p>
      <p className="mt-2 text-lg font-black">GoogleでもDROPの新着を見つけやすく</p>
      <p className="mt-1 text-sm leading-relaxed text-blue-950/75">
        DROPを優先ソースに追加すると、Google検索のニュースやAI検索で新着が表示されやすくなります。
      </p>
      <div
        className="mt-4 min-h-11"
        onClickCapture={() => trackEvent("preferred_source_click", { placement })}
        {...preferredSourceAttribute}
      />
    </aside>
  )
}
