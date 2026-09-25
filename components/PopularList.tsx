import Link from "next/link"
import { Article } from "@/lib/types"
import { StarIcon } from "@/components/icons"
import { TrackedLink } from "@/components/TrackedLink"

export function PopularList({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null
  return (
    <div>
      <h2 className="text-sm font-bold mb-4 flex items-center gap-1.5">
        <StarIcon className="size-3.5 text-accent-foreground fill-accent" />
        人気の投稿（7日間）
      </h2>
      <ol className="space-y-3">
        {articles.map((a, i) => (
          <li key={a.id}>
            <TrackedLink event="internal_article_click" params={{ article_id: a.id, placement: "popular", position: i + 1 }}>
              <Link href={`/articles/${a.slug}`} className="flex items-center gap-3 group">
                <span className="text-xl font-black text-muted-foreground/30 w-5 shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm font-semibold leading-snug line-clamp-2 text-wrap-phrase group-hover:underline">
                  {a.title}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.coverImage} alt="" loading="lazy" decoding="async" width="48" height="48" className="size-12 rounded-md object-cover shrink-0" />
              </Link>
            </TrackedLink>
          </li>
        ))}
      </ol>
    </div>
  )
}
