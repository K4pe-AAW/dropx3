"use client"

import { useEffect, useState } from "react"
import type { BrandCrawlSource, Draft } from "@/lib/types"
import { DraftReviewContent } from "./DraftReviewContent"
import { takeDraftHandoff } from "@/lib/draft-handoff-client"

const POLL_INTERVAL_MS = 1500
const MAX_POLLS = 10

/**
 * サーバー側の初回読み取りでまだ見つからなかった下書き(生成直後のBlob伝播遅延)を、
 * 1) 生成した本人のsessionStorage受け渡し、2) それも無ければAPIポーリング、の順で回収する。
 * 見つからないまま終わっても、Next.jsの汎用notFound()より状況が伝わる文言で案内する。
 */
export function DraftReviewPending({ id, brandSources }: { id: string; brandSources: BrandCrawlSource[] }) {
  const [draft, setDraft] = useState<Draft | null>(() => takeDraftHandoff(id))
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    if (draft || pollCount >= MAX_POLLS) return
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/drafts/${id}`)
        if (res.ok) {
          const data = await res.json()
          setDraft(data.draft as Draft)
          return
        }
      } catch {
        // 次のポーリングで再試行
      }
      setPollCount((c) => c + 1)
    }, POLL_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [draft, pollCount, id])

  if (draft) return <DraftReviewContent draft={draft} brandSources={brandSources} />

  if (pollCount >= MAX_POLLS) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
        <p className="mb-3">
          下書きが見つかりませんでした。生成した直後の場合は反映に時間がかかっていることがあります。少し待ってから再読み込みしてください。
        </p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-bold"
        >
          再読み込み
        </button>
      </div>
    )
  }

  return <p className="text-sm text-muted-foreground py-10 text-center">下書きを準備しています…</p>
}
