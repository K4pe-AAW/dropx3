"use client"

import { useEffect, useRef, useState } from "react"
import {
  AFFILIATE_REL,
  HOME_HORIZONTAL_A8_PROMOS,
  type HomeHorizontalA8Promo,
} from "@/lib/affiliate"
import { trackEvent } from "@/lib/analytics"

const ROTATION_STORAGE_KEY = "dropx3-home-horizontal-promo-next-v1"

/** 保存された次回indexを優先し、初回だけランダムに開始位置を分散する。 */
export function selectHorizontalPromo(
  storedNext: string | null,
  randomValue = Math.random()
): { promo: HomeHorizontalA8Promo; nextIndex: number } {
  const parsed = Number.parseInt(storedNext ?? "", 10)
  const index = Number.isInteger(parsed) && parsed >= 0 && parsed < HOME_HORIZONTAL_A8_PROMOS.length
    ? parsed
    : Math.floor(Math.max(0, Math.min(randomValue, 0.999999)) * HOME_HORIZONTAL_A8_PROMOS.length)

  return {
    promo: HOME_HORIZONTAL_A8_PROMOS[index],
    nextIndex: (index + 1) % HOME_HORIZONTAL_A8_PROMOS.length,
  }
}

/** トップの最新記事直前に置く、A8.net公式横長バナー。ページ表示ごとに2案件を交互表示する。 */
export function HorizontalAffiliateBanner({ promo: fixedPromo }: { promo?: HomeHorizontalA8Promo } = {}) {
  const [promo, setPromo] = useState<HomeHorizontalA8Promo | null>(fixedPromo ?? null)
  const anchorRef = useRef<HTMLAnchorElement>(null)
  const firedRef = useRef(false)
  const selectedRef = useRef(Boolean(fixedPromo))

  useEffect(() => {
    if (selectedRef.current) return
    selectedRef.current = true

    let storedNext: string | null = null
    try {
      storedNext = window.sessionStorage.getItem(ROTATION_STORAGE_KEY)
    } catch {
      // storageが利用できないブラウザでも、バナー自体は表示する。
    }

    const selection = selectHorizontalPromo(storedNext)
    try {
      window.sessionStorage.setItem(ROTATION_STORAGE_KEY, String(selection.nextIndex))
    } catch {
      // 保存できない場合は次回もランダム選定でよい。
    }
    setPromo(selection.promo)
  }, [])

  useEffect(() => {
    if (!promo) return
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
              affiliate_network: "a8",
              item_name: promo.itemName,
              placement: "home_latest_banner",
              article_id: promo.placementId,
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
  }, [promo])

  // A8の画像・計測ピクセルを2案件とも先読みしないため、選定完了までは同じ高さの空枠を出す。
  if (!promo) {
    return <div className="mb-8 min-h-[62px] w-full sm:min-h-[74px]" aria-hidden="true" />
  }

  return (
    <div className="relative mb-8 w-full">
      <div className="relative w-full overflow-hidden rounded-lg border border-border bg-[#eef1f3] shadow-sm">
        <span className="absolute right-1.5 top-1.5 z-10 rounded bg-black/75 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white">
          PR
        </span>
        <a
          ref={anchorRef}
          href={promo.href}
          target="_blank"
          rel={AFFILIATE_REL}
          aria-label={promo.ariaLabel}
          onClick={() =>
            trackEvent("affiliate_click", {
              affiliate_network: "a8",
              item_name: promo.itemName,
              item_brand: promo.brand,
              placement: "home_latest_banner",
              article_id: promo.placementId,
              article_title: promo.itemName,
              content_type: "PROMO",
              link_url: promo.href,
            })
          }
          className="flex min-h-[60px] w-full items-center justify-center transition-opacity hover:opacity-90 sm:min-h-[72px]"
        >
          {/* A8.net配布素材を改変せず、広告主側の更新が反映されるURLで表示する。 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={promo.imageUrl}
            width="468"
            height="60"
            alt={promo.alt}
            className="block h-auto w-full max-w-[468px]"
          />
        </a>
        {/* A8.net標準広告コードの表示計測ピクセル。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={promo.trackingPixelUrl}
          width="1"
          height="1"
          alt=""
          aria-hidden="true"
          className="absolute h-px w-px opacity-0"
        />
      </div>
    </div>
  )
}
