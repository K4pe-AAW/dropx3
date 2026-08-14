"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"

/**
 * Google AdSenseのオート広告タグ。NEXT_PUBLIC_ADSENSE_CLIENT_ID未設定なら何も描画しない
 * (Analytics.tsxのGA4タグと同じ「未設定なら何もしない」方針)。
 * /admin配下では読み込まない(管理画面に広告を出さない、Analytics.tsxと同じ理由)。
 * ページ内の配置はGoogle側が自動で決めるため、AdSlot/Sidebarの枠は別途手動で
 * ディスプレイ広告ユニットを割り当てるまでプレースホルダーのまま残る。
 */
export function AdsenseAutoAds() {
  const pathname = usePathname()
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  if (!clientId || pathname?.startsWith("/admin")) return null

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}
