import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin-auth"

// Next.js 16: この機能は`middleware`から`proxy`に改称された。
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md 参照。
// v16よりProxyの既定ランタイムはNode.jsなので、admin-auth.tsのcrypto(node:crypto)がそのまま動く。
export const config = {
  matcher: ["/admin/:path*", "/api/drafts/:path*", "/api/admin/:path*"],
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ログイン画面とログインAPI自体は保護しない（保護すると誰もログインできなくなる）
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next()
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  if (verifyAdminToken(token)) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const loginUrl = new URL("/admin/login", request.url)
  loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}
