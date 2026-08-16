"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

/**
 * AdSenseディスプレイ広告ユニット1枠分。スクリプト自体はAdsenseAutoAdsが
 * サイト全体で読み込み済みのため、ここではins要素の設置とpush({})だけ行う。
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID未設定なら何も描画しない(他コンポーネントと同じ方針)。
 */
export function AdUnit({ slot, className }: { slot: string; className?: string }) {
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // adsbygoogleスクリプト未読み込み(広告ブロッカー等)。insは空のまま残る。
    }
  }, [])

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  if (!clientId) return null

  return (
    <ins
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block" }}
      data-ad-client={clientId}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
