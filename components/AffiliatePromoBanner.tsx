"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { AFFILIATE_REL, ULTORA_A8_PROMO } from "@/lib/affiliate"
import { AffiliateNetwork, trackEvent } from "@/lib/analytics"

const MYTREX_ITEM_NAME = "MYTREX VIDO MT-VD22B"
const MYTREX_PLACEMENT_ID = "sidebar-mytrex-vido"

function useAffiliateImpression(
  anchorRef: React.RefObject<HTMLAnchorElement | null>,
  network: AffiliateNetwork,
  itemName: string,
  placementId: string
) {
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
              affiliate_network: network,
              item_name: itemName,
              placement: "sidebar_promo",
              article_id: placementId,
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
  }, [anchorRef, itemName, network, placementId])
}

/**
 * サイドバー用の画像広告枠。ULTORAを上、MYTREX VIDOを下に並べ、商品ごとの
 * インプレッションとクリックをGA4で比較できるようにする。
 */
export function AffiliatePromoBanner({ mytrexHref }: { mytrexHref: string }) {
  const ultoraRef = useRef<HTMLAnchorElement>(null)
  const mytrexRef = useRef<HTMLAnchorElement>(null)
  useAffiliateImpression(ultoraRef, "a8", ULTORA_A8_PROMO.itemName, ULTORA_A8_PROMO.placementId)
  useAffiliateImpression(mytrexRef, "rakuten", MYTREX_ITEM_NAME, MYTREX_PLACEMENT_ID)

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <span className="absolute right-2 top-2 z-10 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">
          PR
        </span>
        <a
          ref={ultoraRef}
          href={ULTORA_A8_PROMO.href}
          target="_blank"
          rel={AFFILIATE_REL}
          aria-label="ULTORA公式プロテインを見る（PR）"
          onClick={() =>
            trackEvent("affiliate_click", {
              affiliate_network: "a8",
              item_name: ULTORA_A8_PROMO.itemName,
              item_brand: "ULTORA",
              placement: "sidebar_promo",
              article_id: ULTORA_A8_PROMO.placementId,
              article_title: "ULTORAプロテイン",
              content_type: "PROMO",
              link_url: ULTORA_A8_PROMO.href,
            })
          }
          className="block transition-opacity hover:opacity-90"
        >
          {/* A8.net配布素材は広告主側で差し替えられるため、Next/Imageへ取り込まず原寸URLを使う。 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ULTORA_A8_PROMO.imageUrl}
            width="300"
            height="250"
            alt="ULTORAプロテイン公式ストア"
            className="block h-auto w-full"
          />
        </a>
        {/* A8.netの標準広告コードに含まれる表示計測ピクセル。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ULTORA_A8_PROMO.trackingPixelUrl}
          width="1"
          height="1"
          alt=""
          aria-hidden="true"
          className="absolute h-px w-px opacity-0"
        />
      </div>

      <a
        ref={mytrexRef}
        href={mytrexHref}
        target="_blank"
        rel={AFFILIATE_REL}
        aria-label="MYTREX VIDOを楽天市場で見る（PR）"
        onClick={() =>
          trackEvent("affiliate_click", {
            affiliate_network: "rakuten",
            item_name: MYTREX_ITEM_NAME,
            item_brand: "MYTREX",
            placement: "sidebar_promo",
            article_id: MYTREX_PLACEMENT_ID,
            article_title: "MYTREX VIDO",
            content_type: "PROMO",
            link_url: mytrexHref,
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
    </div>
  )
}
