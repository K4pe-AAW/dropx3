"use client"

import { useState } from "react"

export function CopySocialPostButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? "コピー済み" : "投稿文をコピー"}
    </button>
  )
}
