"use client"

import { useEffect, useRef } from "react"
import { trackEvent } from "@/lib/analytics"

export const ARTICLE_BODY_CLASS_NAME = "space-y-5 text-[15px] leading-[1.9] text-wrap-phrase"

/**
 * 本文90%地点の段落(Math.floor((段落数-1)*0.9)番目)にIntersectionObserverのsentinelを
 * 直接張り、ビューポートに入った時点で読了とみなす。ページ全体の高さではなく本文段落数を
 * 基準にするのは、本文の後ろに続く購入リンク等のブロックまで含めた「ページ全体の90%スクロール」
 * だと基準がぶれる(GA4拡張計測の自動scrollイベントと役割が重複する)ため。1記事につき1回のみ発火。
 */
export function ArticleBody({
  paragraphs,
  articleId,
  articleTitle,
  category,
  brand,
}: {
  paragraphs: string[]
  articleId: string
  articleTitle: string
  category: string
  brand?: string
}) {
  const sentinelRef = useRef<HTMLParagraphElement>(null)
  const sentinelIndex = Math.max(0, Math.floor((paragraphs.length - 1) * 0.9))

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    let fired = false
    const observer = new IntersectionObserver(
      (entries) => {
        if (fired || !entries.some((entry) => entry.isIntersecting)) return
        fired = true
        trackEvent("article_read_complete", { article_id: articleId, article_title: articleTitle, category, brand })
        observer.disconnect()
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [articleId, articleTitle, category, brand])

  return (
    <div className={ARTICLE_BODY_CLASS_NAME}>
      {paragraphs.map((p, i) => (
        <p key={i} ref={i === sentinelIndex ? sentinelRef : undefined}>
          {p}
        </p>
      ))}
    </div>
  )
}
