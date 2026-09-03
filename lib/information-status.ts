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

export function unconfirmedNotice(status: "rumor" | "leak"): string {
  return status === "leak"
    ? "本記事の内容は、現時点ではリーク・未確認情報です。価格、発売日、仕様、国内展開などは変更される可能性があります。今後のブランド公式発表と情報解禁を待ちましょう。"
    : "本記事の内容は、現時点ではGoss!p・未確認情報です。価格、発売日、仕様、国内展開などは変更される可能性があります。今後のブランド公式発表を待ちましょう。"
}
