import { NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE_NAME, issueAdminToken } from "@/lib/admin-auth"

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "サーバーにADMIN_PASSWORDが設定されていません（.env.local参照）" },
      { status: 500 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const password = typeof body.password === "string" ? body.password : ""
  const token = issueAdminToken(password)

  if (!token) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
