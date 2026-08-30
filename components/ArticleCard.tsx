import Link from "next/link"
import { Article } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { PlayIcon } from "@/components/icons"
import { INFORMATION_STATUS_LABELS, isUnconfirmedStatus } from "@/lib/information-status"

function isNew(publishedAt: string) {
  const hours = (Date.now() - new Date(publishedAt).getTime()) / 36e5
  return hours >= 0 && hours < 48
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const week = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${week}`
}

/**
 * スマホ幅ではサムネ小+テキスト横並びのリスト行(uptodate.tokyo等のニュースアプリでよく見る形)、
 * sm以上では従来通り画像が上に大きく載るカード型に切り替える。1つのマークアップをTailwindの
 * レスポンシブクラスだけで出し分け、ページ側(グリッドを組んでいる6箇所)は変更不要にしている。
 */
export function ArticleCard({ article, priority = false }: { article: Article; priority?: boolean }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group flex items-center gap-3 border-b border-border pb-4 sm:block sm:border-0 sm:pb-0"
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border-2 border-accent bg-muted sm:mb-3 sm:aspect-[4/3] sm:size-auto sm:rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- 提携先ごとに画像ドメインが変わるためnext/imageのremotePatternsを固定できない */}
        <img
          src={article.youtubeVideoId ? `https://img.youtube.com/vi/${article.youtubeVideoId}/hqdefault.jpg` : article.coverImage}
          alt={article.coverImageAlt}
          loading={priority ? "eager" : "lazy"}
          className="h-full w-full object-cover transition-transform duration-300 sm:group-hover:scale-105"
        />
        {article.youtubeVideoId && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex size-7 items-center justify-center rounded-full bg-black/60 sm:size-12">
              <PlayIcon className="size-3 translate-x-0.5 text-white sm:size-5" />
            </div>
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 hidden gap-1.5 sm:flex">
          {article.brands[0] && <Badge variant="default">{article.brands[0]}</Badge>}
        </div>
        <div className="absolute top-1.5 right-1.5 flex gap-1.5 sm:top-2 sm:right-2">
          {isUnconfirmedStatus(article.informationStatus) && (
            <Badge variant="accent" className="bg-amber-500 text-black px-1.5 py-0 text-[9px] sm:px-2 sm:py-0.5 sm:text-[11px]">
              {INFORMATION_STATUS_LABELS[article.informationStatus].split(" /")[0]}
            </Badge>
          )}
          {isNew(article.publishedAt) && (
            <Badge variant="accent" className="px-1.5 py-0 text-[9px] sm:px-2 sm:py-0.5 sm:text-[11px]">
              NEW
            </Badge>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground mb-1">{formatDate(article.publishedAt)}</p>
        <h3 className="text-sm font-bold leading-snug line-clamp-2 text-wrap-phrase group-hover:underline decoration-2 underline-offset-2">
          {article.title}
        </h3>
      </div>
    </Link>
  )
}
