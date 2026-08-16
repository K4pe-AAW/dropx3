import Link from "next/link"
import type { Article } from "@/lib/types"
import { categoryLabel } from "@/lib/site-config"

export function ArticlesList({ articles }: { articles: Article[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-6">
      {articles.map((a) => (
        <Link
          key={a.id}
          href={`/admin/articles/${a.id}/edit`}
          className="flex flex-col gap-2 border border-border rounded-xl p-4 hover:bg-secondary/50 transition-colors"
        >
          <p className="font-bold text-sm line-clamp-2">{a.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-3">{a.excerpt}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-auto pt-1">
            {categoryLabel(a.category)} ・ {a.brands.join(", ") || "ブランドなし"} ・{" "}
            {new Date(a.publishedAt).toLocaleDateString("ja-JP")}
          </p>
        </Link>
      ))}
    </div>
  )
}
