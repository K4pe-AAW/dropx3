import Link from "next/link"

const LEAD_COUNT = 3

/**
 * ページ数が多いと全件並べた際に折り返して見づらくなる(totalPages=12で2行になる等)ため、
 * 先頭1〜3ページ + (必要なら現在地) + 最終ページ、の形に間引く。間に1ページしか挟まらない場合は
 * "…"にせずその番号をそのまま出す(1個だけ省略しても行数がほぼ減らないため)。
 */
function getPageItems(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= LEAD_COUNT + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const items: (number | "ellipsis")[] = Array.from({ length: LEAD_COUNT }, (_, i) => i + 1)

  if (currentPage > LEAD_COUNT && currentPage < totalPages) {
    if (currentPage === LEAD_COUNT + 1) {
      items.push(currentPage)
    } else {
      items.push("ellipsis", currentPage)
    }
  }

  const tail = items[items.length - 1] as number
  const gap = totalPages - tail
  if (gap === 2) {
    items.push(tail + 1, totalPages)
  } else if (gap > 1) {
    items.push("ellipsis", totalPages)
  } else if (gap === 1) {
    items.push(totalPages)
  }

  return items
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  extraParams,
}: {
  currentPage: number
  totalPages: number
  basePath: string
  /** 検索クエリ等、ページ送りの間も維持したい追加のクエリパラメータ(例: {q: "Nike"}) */
  extraParams?: Record<string, string>
}) {
  if (totalPages <= 1) return null

  const pageHref = (page: number) => {
    const params = new URLSearchParams(extraParams)
    if (page > 1) params.set("page", String(page))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }
  const pillClass =
    "rounded-full border px-3.5 py-1.5 transition-colors border-border hover:bg-accent hover:text-accent-foreground hover:border-accent"
  const activePillClass = "rounded-full border px-3.5 py-1.5 border-accent bg-accent text-accent-foreground"

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2 mt-10 text-sm font-medium">
      {currentPage > 1 && (
        <Link href={pageHref(currentPage - 1)} className={pillClass}>
          前へ
        </Link>
      )}
      {getPageItems(currentPage, totalPages).map((item, i) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground select-none">
            …
          </span>
        ) : (
          <Link key={item} href={pageHref(item)} className={item === currentPage ? activePillClass : pillClass}>
            {item}
          </Link>
        )
      )}
      {currentPage < totalPages && (
        <Link href={pageHref(currentPage + 1)} className={pillClass}>
          次へ
        </Link>
      )}
    </nav>
  )
}
