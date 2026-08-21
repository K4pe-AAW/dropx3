import type { Metadata } from "next"
import { getDraftById, getCrawlSources } from "@/lib/storage"
import { DraftReviewContent } from "@/components/admin/DraftReviewContent"
import { DraftReviewPending } from "@/components/admin/DraftReviewPending"

export const metadata: Metadata = { title: "下書きレビュー" }

export default async function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [draft, crawlSources] = await Promise.all([getDraftById(id), getCrawlSources()])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-xl font-black mb-1">下書きレビュー</h1>
      {draft ? (
        <DraftReviewContent draft={draft} brandSources={crawlSources.brands} />
      ) : (
        <DraftReviewPending id={id} brandSources={crawlSources.brands} />
      )}
    </div>
  )
}
