import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getArticleById } from "@/lib/storage"
import { EditArticleForm } from "@/components/admin/EditArticleForm"

export const metadata: Metadata = { title: "記事を編集" }

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = await getArticleById(id)
  if (!article) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-xl font-black mb-2">記事を編集</h1>
      <p className="text-sm text-muted-foreground mb-8">
        公開中: <a href={`/articles/${article.slug}`} className="underline">/articles/{article.slug}</a>
      </p>
      <EditArticleForm article={article} />
    </div>
  )
}
