import type { Metadata } from "next"
import { LoginForm } from "@/components/admin/LoginForm"

export const metadata: Metadata = { title: "管理画面ログイン" }

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <h1 className="text-xl font-black mb-6">管理画面ログイン</h1>
      <LoginForm nextPath={next && next.startsWith("/") ? next : "/admin"} />
    </div>
  )
}
