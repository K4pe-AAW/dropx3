"use client"

import { useEffect, useRef } from "react"
import { AFFILIATE_REL, ORBIS_MR_A8_PROMO } from "@/lib/affiliate"
import { trackEvent } from "@/lib/analytics"

/** トップの最新記事直前に置く、A8.net公式横長バナー。 */
export function HorizontalAffiliateBanner() {
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
              affiliate_network: "a8",
              item_name: ORBIS_MR_A8_PROMO.itemName,
              placement: "home_latest_banner",
              article_id: ORBIS_MR_A8_PROMO.placementId,
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
    <div className="relative mb-8 w-full">
      <div className="relative w-full overflow-hidden rounded-lg border border-border bg-[#eef1f3] shadow-sm">
        <span className="absolute right-1.5 top-1.5 z-10 rounded bg-black/75 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white">
          PR
        </span>
        <a
          ref={anchorRef}
          href={ORBIS_MR_A8_PROMO.href}
          target="_blank"
          rel={AFFILIATE_REL}
          aria-label="オルビス ミスター公式を見る（PR・オルビス初回限定）"
          onClick={() =>
            trackEvent("affiliate_click", {
              affiliate_network: "a8",
              item_name: ORBIS_MR_A8_PROMO.itemName,
              item_brand: "ORBIS",
              placement: "home_latest_banner",
              article_id: ORBIS_MR_A8_PROMO.placementId,
              article_title: "オルビス ミスター",
              content_type: "PROMO",
              link_url: ORBIS_MR_A8_PROMO.href,
            })
          }
          className="flex min-h-[60px] w-full items-center justify-center transition-opacity hover:opacity-90 sm:min-h-[72px]"
        >
          {/* A8.net配布素材を改変せず、広告主側の更新が反映されるURLで表示する。 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ORBIS_MR_A8_PROMO.imageUrl}
            width="468"
            height="60"
            alt="オルビス ミスター メンズスキンケア"
            className="block h-auto w-full max-w-[468px]"
          />
        </a>
        {/* A8.net標準広告コードの表示計測ピクセル。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ORBIS_MR_A8_PROMO.trackingPixelUrl}
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
