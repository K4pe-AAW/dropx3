"use client"

import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter()

  async function handleClick() {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <button onClick={handleClick} className="text-xs text-muted-foreground hover:text-foreground underline">
      ログアウト
    </button>
  )
}
