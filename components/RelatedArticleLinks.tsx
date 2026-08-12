import Link from "next/link"
import type { RelatedArticleLink } from "@/lib/types"

/**
 * BUY/GUIDE型記事など、本文中で触れた既存記事へ内部リンクするための編集者キュレーション枠。
 * ページ下部の自動関連記事(ArticleCardグリッド)とは別物——あちらはbrand/category一致による
 * 自動抽出、こちらは編集者が意図的に選んだリンク。
 */
export function RelatedArticleLinks({ links }: { links: RelatedArticleLink[] }) {
  if (links.length === 0) return null
  return (
    <div className="mt-8 rounded-xl border border-border p-4">
      <h2 className="text-xs font-bold text-muted-foreground mb-3">この記事で紹介した商品・記事</h2>
      <ul className="space-y-2.5">
        {links.map((l, i) => (
          <li key={i}>
            <Link href={`/articles/${l.slug}`} className="text-sm font-semibold hover:underline">
              → {l.title}
            </Link>
            {l.note && <p className="text-xs text-muted-foreground mt-0.5">{l.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
