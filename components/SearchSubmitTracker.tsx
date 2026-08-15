"use client"

import { useEffect, useRef } from "react"
import { trackEvent } from "@/lib/analytics"

/**
 * 検索フォームは/searchへの通常のGETナビゲーションで、結果件数はサーバー側でしか
 * 確定しない。そのためonSubmitではなく検索結果ページ側(結果件数が確定した後)で発火する。
 * queryが変わった時だけ発火し、同じ検索のページネーション(pageのみの変化)では
 * 再発火しない(App Routerのクライアント遷移ではこのコンポーネント自体は再マウントされず
 * propsだけ更新されるため、useRefでの重複防止が必要)。
 */
export function SearchSubmitTracker({ query, resultCount }: { query: string; resultCount: number }) {
  const lastFiredQueryRef = useRef<string | null>(null)

  useEffect(() => {
    if (!query || lastFiredQueryRef.current === query) return
    lastFiredQueryRef.current = query
    trackEvent("search_submit", { search_term: query, result_count: resultCount })
  }, [query, resultCount])

  return null
}
