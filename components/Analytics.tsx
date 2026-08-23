"use client"

import { useEffect } from "react"
import Script from "next/script"
import { usePathname } from "next/navigation"

/**
 * GA4計測タグ。NEXT_PUBLIC_GA_MEASUREMENT_ID未設定なら何も描画しない
 * (GOOGLE_CSE_API_KEY等、他の任意連携と同じ「未設定なら何もしない」方針)。
 *
 * /admin配下のpage_viewは送らない。以前は「/adminなら<Script>ごと描画しない」方式だったが、
 * それだと不十分だった——公開ページ(gtag読み込み済み)から/adminへSPA遷移(戻る操作含む)した
 * 場合、GA4の拡張計測(履歴変更の自動追跡)がこのReactコンポーネントのマウント状態と無関係に
 * page_viewを送ってしまい、実際にgrowth-osの実データで/admin配下のPVが計測されていた
 * (2026-08-23に発覚)。gtag側の自動page_view送信をsend_page_view:falseで止め、pathname変化の
 * たびに/admin以外の場合だけ手動でpage_viewを送る方式にして、直接アクセス・SPA遷移の
 * どちらのルートでも確実に除外されるようにした。
 */
export function Analytics() {
  const pathname = usePathname()
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  useEffect(() => {
    if (!measurementId || typeof window.gtag !== "function" || !pathname) return
    if (pathname.startsWith("/admin")) return
    window.gtag("event", "page_view", { page_path: pathname })
  }, [pathname, measurementId])

  if (!measurementId) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}
