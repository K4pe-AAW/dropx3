"use client"

import { useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/lib/site-config"
import { MenuIcon, CloseIcon } from "@/components/icons"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="sm:hidden w-full flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-accent px-4 py-1.5 text-xs font-medium text-primary-foreground/85"
      >
        {open ? <CloseIcon className="size-4" /> : <MenuIcon className="size-4" />}
        メニュー
      </button>

      {open && (
        <nav className="mt-4 flex w-full flex-col items-stretch gap-1.5 text-sm font-medium">
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
              onClick={() => setOpen(false)}
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
    </div>
  )
}
