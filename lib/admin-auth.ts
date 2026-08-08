import crypto from "crypto"

export const ADMIN_COOKIE_NAME = "dropwire_admin"

function expectedToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) return null
  return crypto.createHash("sha256").update(pw).digest("hex")
}

/** cookieの値を検証する。timingSafeEqualで文字列長を揃えてから比較しタイミング攻撃を避ける */
export function verifyAdminToken(token: string | undefined | null): boolean {
  const expected = expectedToken()
  if (!expected || !token) return false
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** パスワードが正しければcookieに保存すべきトークンを返す。誤っていればnull */
export function issueAdminToken(candidatePassword: string): string | null {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw || !candidatePassword) return null
  if (candidatePassword !== pw) return null
  return expectedToken()
}
