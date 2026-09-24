import type { InformationStatus } from "./types"

export const INFORMATION_STATUSES: readonly InformationStatus[] = ["official", "report", "rumor", "leak"]

export function isInformationStatus(value: unknown): value is InformationStatus {
  return typeof value === "string" && INFORMATION_STATUSES.includes(value as InformationStatus)
}

export const INFORMATION_STATUS_LABELS: Record<InformationStatus, string> = {
  official: "OFFICIAL",
  report: "REPORT",
  rumor: "Goss!p / 未確認情報",
  leak: "LEAK / 未確認情報",
}

export function isUnconfirmedStatus(status: InformationStatus | undefined): status is "rumor" | "leak" {
  return status === "rumor" || status === "leak"
}

export function detectUnconfirmedStatus(text: string): "rumor" | "leak" | undefined {
  if (/(?:リーク|流出画像|流出した|\bleak(?:ed|s|ing)?\b)/i.test(text)) return "leak"
  if (/(?:噂|Goss!p|Gossp!|未確認情報|\brumou?rs?\b)/i.test(text)) return "rumor"
  return undefined
}

export function ensureUnconfirmedTitle(title: string, status: InformationStatus): string {
  if (status === "leak" && !/(?:リーク|LEAK|〜か|登場か)/i.test(title)) return `リーク｜${title}`
  if (status === "rumor" && !/(?:Goss!p|Gossp!|噂|RUMOR|〜か|登場か)/i.test(title)) return `Goss!p｜${title}`
  return title
}

/**
 * 楽天の検索結果や店舗トップではなく、個別の商品詳細ページだけを販売実在の根拠にする。
 * 自動生成する楽天アフィリエイト検索リンクはこの判定へ渡さない。
 */
export function isDirectRakutenProductUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, "")
    const path = url.pathname.toLowerCase()
    if (host === "item.rakuten.co.jp") return path.split("/").filter(Boolean).length >= 2
    if (host === "product.rakuten.co.jp") return /^\/product\//.test(path)
    if (host === "brandavenue.rakuten.co.jp") return /\/item\//.test(path)
    if (host === "fashion.rakuten.co.jp") return /\/item\//.test(path)
    return false
  } catch {
    return false
  }
}

export function hasDirectRakutenProductEvidence(urls: Array<string | undefined>): boolean {
  return urls.some((url) => Boolean(url && isDirectRakutenProductUrl(url)))
}

/** 楽天の商品詳細ページで実売を確認できる噂記事はREPORTへ上げる。リーク資料は別扱いのため維持する。 */
export function applyRakutenProductEvidence(
  status: InformationStatus | undefined,
  urls: Array<string | undefined>
): InformationStatus | undefined {
  return status === "rumor" && hasDirectRakutenProductEvidence(urls) ? "report" : status
}

export function removeGosspTitlePrefix(title: string): string {
  return title.replace(/^\s*(?:Goss!p|Gossp!|RUMOR|噂)\s*[｜|:]\s*/i, "").trim()
}

export function unconfirmedNotice(status: "rumor" | "leak"): string {
  return status === "leak"
    ? "本記事の内容は、現時点ではリーク・未確認情報です。価格、発売日、仕様、国内展開などは変更される可能性があります。今後のブランド公式発表と情報解禁を待ちましょう。"
    : "本記事の内容は、現時点ではGoss!p・未確認情報です。価格、発売日、仕様、国内展開などは変更される可能性があります。今後のブランド公式発表を待ちましょう。"
}
