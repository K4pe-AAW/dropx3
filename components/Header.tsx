import Link from "next/link"
import { siteConfig } from "@/lib/site-config"
import { SearchIcon } from "@/components/icons"
import { Logo } from "@/components/Logo"
import { NavMenu } from "@/components/NavMenu"

export function Header() {
  return (
    <header
      className="sticky top-0 z-50 bg-primary text-primary-foreground bg-cover bg-center"
      style={{ backgroundImage: "linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url(/images/hero-bg.jpg)" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col items-center gap-3">
        <div className="w-full flex items-center justify-between gap-3">
          <Link href="/" className="text-accent w-32 lg:w-[700px]" aria-label={siteConfig.name}>
            <Logo className="w-full h-auto" />
          </Link>
          <NavMenu />
        </div>
        <form action="/search" method="get" className="flex items-center">
          <label className="sr-only" htmlFor="site-search">
            記事を探す
          </label>
          <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-full px-3 py-1 focus-within:bg-primary-foreground/15">
            <SearchIcon className="size-3.5 text-primary-foreground/60" />
            <input
              id="site-search"
              type="search"
              name="q"
              placeholder="キーワードで探す"
              className="bg-transparent outline-none placeholder:text-primary-foreground/50 text-primary-foreground text-xs w-28 sm:w-36"
            />
          </div>
        </form>
      </div>
    </header>
  )
}
