const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 8,10,...,22時(JST)・各枠2件、という固定ペースの投稿枠。0時(日付が変わるタイミング)では投稿しない。 */
export const SLOT_HOURS_JST = [8, 10, 12, 14, 16, 18, 20, 22] as const
export const SLOT_CAPACITY = 2

/** UTCのDateから「JSTで見た場合の」年月日を取り出す(JSTは夏時間なしのUTC+9固定なので単純な加算でよい) */
function jstDateParts(date: Date): { year: number; month: number; day: number } {
  const jst = new Date(date.getTime() + JST_OFFSET_MS)
  return { year: jst.getUTCFullYear(), month: jst.getUTCMonth(), day: jst.getUTCDate() }
}

/** JSTでの year/month/day hour:00 に対応するUTCのDateを作る */
function jstSlotDate(year: number, month: number, day: number, hour: number): Date {
  return new Date(Date.UTC(year, month, day, hour, 0, 0, 0) - JST_OFFSET_MS)
}

/**
 * 「8,10,12,14,16,18,20,22時(JST)、1枠あたり最大2件」という固定ペースにおける、
 * 次に空いている投稿枠を返す。今日分が埋まっている/すでに時刻を過ぎている場合は翌日以降へ繰り越す。
 * existingScheduledAtsIsoには予約済み記事のscheduledPublishAt(ISO文字列)を渡す。
 */
export function computeNextSlot(existingScheduledAtsIso: string[], now: Date = new Date()): Date {
  const existingTimes = existingScheduledAtsIso.map((s) => new Date(s).getTime())
  const { year, month, day } = jstDateParts(now)

  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    for (const hour of SLOT_HOURS_JST) {
      const slot = jstSlotDate(year, month, day + dayOffset, hour)
      if (slot.getTime() <= now.getTime()) continue
      const filled = existingTimes.filter((t) => t === slot.getTime()).length
      if (filled < SLOT_CAPACITY) return slot
    }
  }
  throw new Error("空き枠が見つかりませんでした")
}
