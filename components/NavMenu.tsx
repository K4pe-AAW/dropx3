"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/lib/site-config"
import { MenuIcon, CloseIcon } from "@/components/icons"
import { trackEvent } from "@/lib/analytics"

/**
 * 新着記事・カテゴリ・Aboutをまとめた唯一のnav入口。PC/SP問わず同じハンバーガーボタン+
 * ドロップダウンで統一する(以前はPCだけ常時表示のピル行+カテゴリだけ別ドロップダウン
 * だったが、ヒーロー高さを詰めたいのと導線を1本化したいという要望で統合した)。
 */
export function NavMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function selectCategory(slug: string) {
    setOpen(false)
    trackEvent("brand_select", { category: slug, placement: "header_menu" })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={open}
        className="flex shrink-0 flex-col items-center gap-1 text-primary-foreground/85"
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-accent">
          {open ? <CloseIcon className="size-4" /> : <MenuIcon className="size-4" />}
        </span>
        <span className="text-[10px] font-bold tracking-widest">MENU</span>
      </button>

      {open && (
        <nav className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl bg-primary p-3 shadow-lg">
          <div className="grid grid-cols-2 gap-1.5 text-sm font-medium">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="col-span-2 rounded-full border border-accent px-3.5 py-2 text-center text-primary-foreground/85 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              新着記事
            </Link>
            {siteConfig.categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                onClick={() => selectCategory(c.slug)}
                className="rounded-full border border-accent px-2.5 py-2 text-center text-xs text-primary-foreground/85 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {c.label}
              </Link>
            ))}
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="col-span-2 rounded-full border border-accent px-3.5 py-2 text-center text-primary-foreground/85 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              About
            </Link>
          </div>
        </nav>
      )}
    </div>
  )
}
