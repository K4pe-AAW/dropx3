import { AffiliateLink } from "./types"

/**
 * アフィリエイトリンクに必須のrel属性。
 * - sponsored: Googleに広告/成果報酬リンクであることを伝える
 * - nofollow: 念のため二重で明示
 * - noopener noreferrer: window.opener経由の脆弱性とリファラ漏洩を防ぐ
 */
export const AFFILIATE_REL = "sponsored nofollow noopener noreferrer"

/** http(s)以外のスキーム(javascript:, data: 等)を弾く。AI下書きや外部データ由来のURLを描画する前の最終防衛線 */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}

export function sanitizeAffiliateLinks(links: AffiliateLink[]): AffiliateLink[] {
  return links.filter((link) => isSafeExternalUrl(link.url))
}
