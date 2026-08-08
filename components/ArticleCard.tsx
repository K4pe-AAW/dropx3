import Link from "next/link"
import { Article } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { PlayIcon } from "@/components/icons"

function isNew(publishedAt: string) {
  const hours = (Date.now() - new Date(publishedAt).getTime()) / 36e5
  return hours >= 0 && hours < 48
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const week = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${week}`
}

export function ArticleCard({ article, priority = false }: { article: Article; priority?: boolean }) {
  return (
    <Link href={`/articles/${article.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted mb-3 border-2 border-accent">
        {/* eslint-disable-next-line @next/next/no-img-element -- 提携先ごとに画像ドメインが変わるためnext/imageのremotePatternsを固定できない */}
        <img
          src={article.youtubeVideoId ? `https://img.youtube.com/vi/${article.youtubeVideoId}/hqdefault.jpg` : article.coverImage}
          alt={article.coverImageAlt}
          loading={priority ? "eager" : "lazy"}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {article.youtubeVideoId && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="size-12 rounded-full bg-black/60 flex items-center justify-center">
              <PlayIcon className="size-5 text-white translate-x-0.5" />
            </div>
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {article.brands[0] && <Badge variant="default">{article.brands[0]}</Badge>}
        </div>
        <div className="absolute top-2 right-2 flex gap-1.5">
          {isNew(article.publishedAt) && <Badge variant="accent">NEW</Badge>}
        </div>
        {article.affiliateLinks.length > 0 && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="pr">PR</Badge>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-1">{formatDate(article.publishedAt)}</p>
      <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:underline decoration-2 underline-offset-2">
        {article.title}
      </h3>
    </Link>
  )
}
