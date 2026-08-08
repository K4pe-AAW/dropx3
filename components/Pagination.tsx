import Link from "next/link"

export function Pagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number
  totalPages: number
  basePath: string
}) {
  if (totalPages <= 1) return null

  const pageHref = (page: number) => (page <= 1 ? basePath : `${basePath}?page=${page}`)
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
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <Link key={page} href={pageHref(page)} className={page === currentPage ? activePillClass : pillClass}>
          {page}
        </Link>
      ))}
      {currentPage < totalPages && (
        <Link href={pageHref(currentPage + 1)} className={pillClass}>
          次へ
        </Link>
      )}
    </nav>
  )
}
