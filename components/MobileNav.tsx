"use client"

import { useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/lib/site-config"
import { MenuIcon, CloseIcon } from "@/components/icons"
import { trackEvent } from "@/lib/analytics"

/**
 * ボタンとパネルをFragmentで返す(ラップ用divを持たない)。Header側でロゴと同じ行に
 * ボタンを並べ、パネルはabsolute(top-full)で行の下に被さる形にすることで、
 * 開いていない通常時のヒーロー高さに影響を与えない。
 */
export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={open}
        className="sm:hidden flex size-10 shrink-0 items-center justify-center rounded-full border border-accent text-primary-foreground/85"
      >
        {open ? <CloseIcon className="size-4" /> : <MenuIcon className="size-4" />}
      </button>

      {open && (
        <nav className="sm:hidden absolute left-0 right-0 top-full z-50 mt-2 flex flex-col items-stretch gap-1.5 rounded-2xl bg-primary p-3 text-sm font-medium shadow-lg">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="rounded-full border border-accent px-3.5 py-2 text-center text-primary-foreground/85 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            新着記事
          </Link>
          {siteConfig.categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              onClick={() => {
                setOpen(false)
                trackEvent("brand_select", { category: c.slug, placement: "mobile_nav" })
              }}
              className="rounded-full border border-accent px-3.5 py-2 text-center text-primary-foreground/85 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {c.label}
            </Link>
          ))}
          <Link
            href="/about"
            onClick={() => setOpen(false)}
            className="rounded-full border border-accent px-3.5 py-2 text-center text-primary-foreground/85 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            About
          </Link>
        </nav>
      )}
    </>
  )
}
