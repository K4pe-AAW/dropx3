"use client"

import { trackEvent } from "@/lib/analytics"
import { siteConfig } from "@/lib/site-config"

export function XFollowCard({ placement, articleId }: { placement: "article_end" | "home"; articleId?: string }) {
  return (
    <aside className="mt-8 rounded-2xl border border-lime-300 bg-lime-50 p-5 text-lime-950 sm:mt-10 sm:p-6">
      <p className="text-xs font-black tracking-[0.18em]">FOLLOW DROP</p>
      <p className="mt-2 text-lg font-black">再販・抽選締切・ドメブラ新着はXで速報</p>
      <p className="mt-1 text-sm leading-relaxed text-lime-950/75">
        20代後半〜40代のメンズファッションを中心に、毎日の発売情報とDROP編集部の選び方を届けます。
      </p>
      <a
        href={siteConfig.xUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("social_follow_click", {
          platform: "x",
          placement,
          article_id: articleId,
        })}
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-black px-5 py-2.5 text-sm font-black text-white transition-transform hover:-translate-y-0.5"
      >
        {siteConfig.xHandle} をフォロー
      </a>
    </aside>
  )
}

