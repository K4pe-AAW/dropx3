import Link from "next/link"
import type { Metadata } from "next"
import { CopySocialPostButton } from "@/components/admin/CopySocialPostButton"
import { SOCIAL_QUEUE_PATH, type SocialQueueState } from "@/lib/social-promotion"
import { readJson } from "@/lib/storage"

export const metadata: Metadata = { title: "X配信キュー" }
export const dynamic = "force-dynamic"

function jst(value?: string): string {
  return value
    ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "short", timeStyle: "short" }).format(new Date(value))
    : "未生成"
}

export default async function SocialQueuePage() {
  const queue = await readJson<SocialQueueState>(SOCIAL_QUEUE_PATH, { mode: "typefully", drafts: [] })
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-muted-foreground">DISTRIBUTION</p>
          <h1 className="mt-2 text-2xl font-black">X配信キュー</h1>
          <p className="mt-2 text-sm text-muted-foreground">新着・発売当日・更新投稿をTypefully向けに自動生成します。</p>
        </div>
        <Link href="/admin" className="text-sm font-bold underline">管理画面へ戻る</Link>
      </div>

      <div className="mb-6 rounded-xl border border-lime-300 bg-lime-50 p-4 text-sm text-lime-950">
        Typefully連携中（@dropx3tokyo）。最終生成: {jst(queue.generatedAt)}。12枠のうちメンズ／ユニセックスを約9割（最大11件）、その他を最大1件にします。同一日内の重複を避け、翌日以降の再投稿を許可します。リンクにはGA4用UTMが付きます。
      </div>

      <div className="space-y-5">
        {queue.drafts.map((draft) => (
          <article key={draft.id} className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[160px_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.imageUrl} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy" />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black tracking-wider text-muted-foreground">
                <span>{draft.kind.toUpperCase()}</span><span>・</span><span>{draft.reason}</span>
              </div>
              <pre className="my-4 whitespace-pre-wrap font-sans text-sm leading-relaxed">{draft.text}</pre>
              <div className="flex flex-wrap gap-3">
                <CopySocialPostButton text={draft.text} />
                <a href={draft.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-4 py-2 text-xs font-black">記事を確認</a>
              </div>
            </div>
          </article>
        ))}
        {queue.drafts.length === 0 && <p className="text-sm text-muted-foreground">現在、配信条件を満たす候補はありません。</p>}
      </div>
    </main>
  )
}
