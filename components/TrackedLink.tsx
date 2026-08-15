"use client"

import type { ReactNode } from "react"
import { trackEvent, type AnalyticsEventName, type AnalyticsEventParams } from "@/lib/analytics"

/**
 * サーバーコンポーネントが描画した既存のLink/aをそのままラップし、クリックにGA4計測だけを
 * 乗せる。display:contentsで自身のボックスをレイアウトツリーから消すため、flex/grid内に
 * 置いても親のレイアウトに影響しない。preventDefaultはしないので既存の遷移・新規タブ挙動は
 * 変わらない(クリックは内側のa要素からこの要素までバブリングするのでイベントは拾える)。
 */
export function TrackedLink<N extends AnalyticsEventName>({
  event,
  params,
  children,
}: {
  event: N
  params: AnalyticsEventParams<N>
  children: ReactNode
}) {
  return (
    <span style={{ display: "contents" }} onClick={() => trackEvent(event, params)}>
      {children}
    </span>
  )
}
