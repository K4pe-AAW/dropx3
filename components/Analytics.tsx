"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"

/**
 * GA4計測タグ。NEXT_PUBLIC_GA_MEASUREMENT_ID未設定なら何も描画しない
 * (GOOGLE_CSE_API_KEY等、他の任意連携と同じ「未設定なら何もしない」方針)。
 * /admin配下では計測しない(サイト運営者自身の作業がPV/イベントとして混入するのを防ぐ)。
 */
export function Analytics() {
  const pathname = usePathname()
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  if (!measurementId || pathname?.startsWith("/admin")) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  )
}
