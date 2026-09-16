"use client"

import { useEffect, useRef } from "react"
import { AFFILIATE_REL } from "@/lib/affiliate"
import { trackEvent } from "@/lib/analytics"

const ITEM_NAME = "MYTREX VIDO MT-VD22B"
const PLACEMENT_ID = "sidebar-mytrex-vido"

/**
 * サイドバー用の小型アフィリエイト枠。公式画像の転載や加工を避け、商品名・価格・特徴だけで
 * 構成する。広告表示とクリックは記事内購入リンクと同じGA4イベントへ送り、配置で区別する。
 */
export function AffiliatePromoBanner({ href }: { href: string }) {
  const anchorRef = useRef<HTMLAnchorElement>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const el = anchorRef.current
    if (!el) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (firedRef.current) return
        if (entry.isIntersecting) {
          timer = setTimeout(() => {
            if (firedRef.current) return
            firedRef.current = true
            trackEvent("affiliate_impression", {
              affiliate_network: "rakuten",
              item_name: ITEM_NAME,
              placement: "sidebar_promo",
              article_id: PLACEMENT_ID,
            })
            observer.disconnect()
          }, 1000)
        } else if (timer) {
          clearTimeout(timer)
          timer = null
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => {
      if (timer) clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  return (
    <a
      ref={anchorRef}
      href={href}
      target="_blank"
      rel={AFFILIATE_REL}
      aria-label="MYTREX VIDOを楽天市場で見る（PR）"
      onClick={() =>
        trackEvent("affiliate_click", {
          affiliate_network: "rakuten",
          item_name: ITEM_NAME,
          item_brand: "MYTREX",
          placement: "sidebar_promo",
          article_id: PLACEMENT_ID,
          article_title: "MYTREX VIDO",
          content_type: "PROMO",
          link_url: href,
        })
      }
      className="group relative block overflow-hidden rounded-xl border border-black bg-black px-5 py-5 text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="absolute -right-12 -top-10 size-36 rounded-full border border-white/15" aria-hidden="true" />
      <span className="absolute -right-7 top-4 size-24 rounded-full border border-white/10" aria-hidden="true" />

      <span className="relative flex items-center justify-between text-[10px] font-bold tracking-[0.18em] text-white/60">
        <span>MYTREX</span>
        <span>PR</span>
      </span>
      <span className="relative mt-5 block text-[11px] font-medium text-white/65">横振動モーションブラシ</span>
      <strong className="relative mt-1 block text-3xl leading-none tracking-[-0.04em]">VIDO</strong>
      <span className="relative mt-3 block text-xs leading-relaxed text-white/70">
        頭皮を横方向に刺激する、新感覚のセルフケア。
      </span>
      <span className="relative mt-4 flex items-center justify-between gap-3">
        <span className="text-xs font-bold">16,280円（税込）</span>
        <span className="rounded-full bg-accent px-3 py-2 text-[11px] font-bold text-accent-foreground transition-colors group-hover:bg-white">
          楽天市場で見る →
        </span>
      </span>
    </a>
  )
}
