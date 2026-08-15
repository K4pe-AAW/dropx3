"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/lib/site-config"
import { ChevronDownIcon } from "@/components/icons"
import { TrackedLink } from "@/components/TrackedLink"

/**
 * デスクトップnav用。9カテゴリを個別ピルで並べると幅次第で2段に折り返るため、
 * 「カテゴリ」ドロップダウン1つに集約して常時1行に収める。クリックで開閉、
 * 外側クリックで閉じる(ホバーだとトラックパッド操作やタッチで扱いづらいため)。
 */
export function CategoryMenu() {
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full border border-accent px-3.5 py-1.5 text-primary-foreground/85 hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        カテゴリ
        <ChevronDownIcon className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-2xl bg-primary p-3 shadow-lg">
          <div className="grid grid-cols-3 gap-1.5">
            {siteConfig.categories.map((c) => (
              <TrackedLink key={c.slug} event="brand_select" params={{ category: c.slug, placement: "header_nav" }}>
                <Link
                  href={`/category/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-full border border-accent px-2 py-1.5 text-center text-xs text-primary-foreground/85 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {c.label}
                </Link>
              </TrackedLink>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
