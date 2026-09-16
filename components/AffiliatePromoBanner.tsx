"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
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
      className="group relative grid min-h-44 grid-cols-[42%_58%] overflow-hidden rounded-xl border border-black bg-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="relative flex min-h-44 items-center justify-center p-2">
        <Image
          src="/images/affiliate/mytrex-vido-official.jpg"
          alt="MYTREX VIDO 横振動モーションブラシ"
          width={600}
          height={600}
          sizes="(max-width: 1024px) 42vw, 130px"
          className="h-full max-h-44 w-full object-contain"
        />
        <span className="absolute bottom-1 left-2 text-[8px] text-black/40">画像：MYTREX公式</span>
      </span>

      <span className="relative flex min-h-44 flex-col bg-black px-4 py-4 text-white">
        <span className="flex items-center justify-between text-[9px] font-bold tracking-[0.16em] text-white/55">
          <span>MYTREX</span>
          <span>PR</span>
        </span>
        <span className="mt-5 text-[10px] font-medium leading-tight text-white/65">横振動モーションブラシ</span>
        <strong className="mt-1 text-2xl leading-none tracking-[-0.04em]">VIDO</strong>
        <span className="mt-2 text-[11px] font-bold">16,280円（税込）</span>
        <span className="mt-auto rounded-full bg-accent px-2.5 py-2 text-center text-[10px] font-bold text-accent-foreground transition-colors group-hover:bg-white">
          楽天市場で見る →
        </span>
      </span>
    </a>
  )
}
