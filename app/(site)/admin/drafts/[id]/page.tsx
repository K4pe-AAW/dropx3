import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getDraftById } from "@/lib/storage"
import { PublishForm } from "@/components/admin/PublishForm"

export const metadata: Metadata = { title: "下書きレビュー" }

export default async function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const draft = await getDraftById(id)
  if (!draft) notFound()

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-xl font-black mb-1">下書きレビュー</h1>
      <p className="text-xs text-muted-foreground mb-8">
        出典: {draft.sourceRefs.map((r) => `${r.name} (${r.url})`).join(", ")}
      </p>
      <PublishForm draft={draft} />
    </div>
  )
}
