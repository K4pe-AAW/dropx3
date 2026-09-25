"use client"

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics"

export function ArticleViewTracker({
  articleId,
  articleTitle,
  category,
  brand,
  contentType,
}: {
  articleId: string
  articleTitle: string
  category: string
  brand?: string
  contentType?: string
}) {
  useEffect(() => {
    const key = `dropx3-article-view:${articleId}`
    try {
      if (window.sessionStorage.getItem(key) === "1") return
      window.sessionStorage.setItem(key, "1")
    } catch {
      // ストレージが使えない環境でも閲覧自体は計測する。
    }
    trackEvent("article_view", {
      article_id: articleId,
      article_title: articleTitle,
      category,
      brand,
      content_type: contentType,
    })
  }, [articleId, articleTitle, category, brand, contentType])
  return null
}
