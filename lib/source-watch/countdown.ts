import type { SocialInfo } from "./types"

const BARE_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * SocialInfoの日時フィールドは「YYYY-MM-DD」(時刻不明)または「YYYY-MM-DDTHH:mm:ss+09:00」
 * (時刻明記あり)のどちらかで格納される(social-extract.tsのプロンプト参照)。時刻が無い場合、
 * kind="start"なら日本時間0:00、kind="end"なら日本時間23:59:59を補って扱う
 * (「いつからいつまで」の見た目上の妥当な範囲にするためで、捏造ではなく表示上の丸め)。
 */
export function parseSocialDate(raw: string | null | undefined, kind: "start" | "end"): Date | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (BARE_DATE.test(trimmed)) {
    const time = kind === "start" ? "00:00:00" : "23:59:59"
    const d = new Date(`${trimmed}T${time}+09:00`)
    return isNaN(d.getTime()) ? null : d
  }

  const d = new Date(trimmed)
  return isNaN(d.getTime()) ? null : d
}

export type RelevantDeadline = { label: string; at: Date }

/**
 * カードに出す「今いちばん意味のある締切/日程」を1つ選ぶ。優先順位:
 * 応募締切 > 販売終了 > イベント終了 > 応募開始(まだ始まっていない) > 販売開始 > イベント開始。
 * 全て過去日 or 未設定ならnull。
 */
export function pickRelevantDeadline(social: Pick<SocialInfo, "entryDeadlineAt" | "saleEndAt" | "eventEndAt" | "entryStartAt" | "saleStartAt" | "eventStartAt">): RelevantDeadline | null {
  const candidates: { label: string; raw: string | null; kind: "start" | "end" }[] = [
    { label: "応募締切", raw: social.entryDeadlineAt, kind: "end" },
    { label: "販売終了", raw: social.saleEndAt, kind: "end" },
    { label: "イベント終了", raw: social.eventEndAt, kind: "end" },
    { label: "応募開始", raw: social.entryStartAt, kind: "start" },
    { label: "販売開始", raw: social.saleStartAt, kind: "start" },
    { label: "イベント開始", raw: social.eventStartAt, kind: "start" },
  ]
  for (const c of candidates) {
    const at = parseSocialDate(c.raw, c.kind)
    if (at) return { label: c.label, at }
  }
  return null
}

/** 「2日」「18時間」「3時間」「42分」のようなカウントダウン表示。過ぎていれば「終了」 */
export function formatCountdown(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) return "終了"

  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days >= 1) return `あと${days}日`
  if (hours >= 1) return `あと${hours}時間`
  if (minutes >= 1) return `あと${minutes}分`
  return "まもなく終了"
}

/** 締切が近い(24時間以内)かどうか。優先度ブースト判定に使う */
export function isUrgent(target: Date, now: Date = new Date()): boolean {
  const diffMs = target.getTime() - now.getTime()
  return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000
}

export function isToday(target: Date, now: Date = new Date()): boolean {
  const jstFmt = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
  return jstFmt(target) === jstFmt(now)
}

export function isThisWeek(target: Date, now: Date = new Date()): boolean {
  const diffMs = target.getTime() - now.getTime()
  return diffMs > 0 && diffMs <= 7 * 24 * 60 * 60 * 1000
}

/** 「15分前」「3時間前」「2日前」のような検出時刻の相対表示 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime()
  if (diffMs < 0) return "たった今"
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "たった今"
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}
