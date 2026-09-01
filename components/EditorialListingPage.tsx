import type { ContentType } from "@/lib/types"
import { getArticlesByContentType } from "@/lib/storage"
import { ArticleCard } from "@/components/ArticleCard"

const COPY: Record<"COLUMN" | "PICKS", { eyebrow: string; title: string; description: string }> = {
  COLUMN: {
    eyebrow: "COLUMN",
    title: "編集部コラム",
    description: "ニュースの先にある背景や、ブランド・アイテムについての編集部の視点を届けます。",
  },
  PICKS: {
    eyebrow: "EDITOR’S PICKS",
    title: "編集部おすすめ品",
    description: "編集部が実際に気になったもの、欲しいものを、選んだ理由とともに紹介します。",
  },
}

export async function EditorialListingPage({ contentType }: { contentType: Extract<ContentType, "COLUMN" | "PICKS"> }) {
  const articles = await getArticlesByContentType(contentType)
  const copy = COPY[contentType]

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-10 max-w-2xl">
        <p className="mb-2 text-xs font-black tracking-[0.24em] text-accent">{copy.eyebrow}</p>
        <h1 className="mb-3 text-3xl font-black">{copy.title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
      </header>

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, index) => (
            <ArticleCard key={article.id} article={article} priority={index < 3} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-sm text-muted-foreground">
          最初の記事を準備中です。
        </div>
      )}
    </main>
  )
}
