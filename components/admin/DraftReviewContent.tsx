import type { BrandCrawlSource, Draft } from "@/lib/types"
import { PublishForm } from "./PublishForm"

/** サーバー側(page.tsx)とクライアント側フォールバック(DraftReviewPending)の両方から使う表示部分 */
export function DraftReviewContent({ draft, brandSources }: { draft: Draft; brandSources: BrandCrawlSource[] }) {
  return (
    <>
      <p className="text-xs text-muted-foreground mb-2 flex flex-wrap items-baseline gap-x-1.5">
        <span>出典:</span>
        {draft.sourceRefs.map((r, i) => (
          <span key={i}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              {r.name}
            </a>
            {i < draft.sourceRefs.length - 1 && <span>、</span>}
          </span>
        ))}
      </p>
      {draft.sourceWatchProductId && (
        <p className="text-xs text-accent-foreground bg-accent/60 inline-block px-2 py-1 rounded mb-6">
          SOURCE WATCH由来(CONFIRMED) — 画像・リンク・カラー展開は自動入力された候補です。公開前に必ず内容を確認してください。
        </p>
      )}
      {!draft.sourceWatchProductId && <div className="mb-6" />}
      <PublishForm draft={draft} brandSources={brandSources} />
    </>
  )
}
