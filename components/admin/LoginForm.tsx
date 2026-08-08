"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    setLoading(false)

    if (res.ok) {
      router.replace(nextPath)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "ログインに失敗しました")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="ADMIN_PASSWORD"
        autoFocus
        className="w-full h-11 rounded-lg border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "確認中..." : "ログイン"}
      </button>
    </form>
  )
}
