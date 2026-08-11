import { pickRelevantDeadline, isThisWeek, isToday } from "./countdown"
import { LOTTERY_LIKE_SALE_METHODS } from "./labels"
import type { ProductCard } from "./present"

/** SOCIAL WATCH対象のカードだけを取り出す(product.socialが設定されているもの) */
export function socialCardsOf(cards: ProductCard[]): ProductCard[] {
  return cards.filter((c) => Boolean(c.product.social))
}

/**
 * SOCIAL WATCH用の並び順。締切/日程が近いものを最優先し(応募締切・販売終了・イベント終了が
 * 特に優先度が高い)、次に抽選系のsaleMethod、最後に検出が新しい順にする。
 */
export function sortSocialCardsByPriority(cards: ProductCard[]): ProductCard[] {
  return [...cards].sort((a, b) => {
    const socialA = a.product.social
    const socialB = b.product.social
    const deadlineA = socialA ? pickRelevantDeadline(socialA) : null
    const deadlineB = socialB ? pickRelevantDeadline(socialB) : null

    if (deadlineA && !deadlineB) return -1
    if (!deadlineA && deadlineB) return 1
    if (deadlineA && deadlineB) {
      const diff = deadlineA.at.getTime() - deadlineB.at.getTime()
      if (diff !== 0) return diff
    }

    const lotteryA = Boolean(socialA?.saleMethod && LOTTERY_LIKE_SALE_METHODS.includes(socialA.saleMethod))
    const lotteryB = Boolean(socialB?.saleMethod && LOTTERY_LIKE_SALE_METHODS.includes(socialB.saleMethod))
    if (lotteryA !== lotteryB) return lotteryA ? -1 : 1

    return a.product.firstDetectedAt < b.product.firstDetectedAt ? 1 : -1
  })
}

export type SocialSummaryStats = {
  total: number
  newToday: number
  raffle: number
  dueToday: number
  dueThisWeek: number
  release: number
  restock: number
  event: number
}

export function computeSocialSummary(cards: ProductCard[]): SocialSummaryStats {
  const social = socialCardsOf(cards)
  const now = new Date()
  const stats: SocialSummaryStats = { total: social.length, newToday: 0, raffle: 0, dueToday: 0, dueThisWeek: 0, release: 0, restock: 0, event: 0 }

  for (const c of social) {
    const info = c.product.social
    if (!info) continue
    if (isToday(new Date(c.product.firstDetectedAt), now)) stats.newToday++
    if (info.saleMethod && LOTTERY_LIKE_SALE_METHODS.includes(info.saleMethod)) stats.raffle++
    if (info.postTypes.includes("release")) stats.release++
    if (info.postTypes.includes("restock")) stats.restock++
    if (info.postTypes.includes("event") || info.postTypes.includes("popup")) stats.event++

    const deadline = pickRelevantDeadline(info)
    if (deadline) {
      if (isToday(deadline.at, now)) stats.dueToday++
      else if (isThisWeek(deadline.at, now)) stats.dueThisWeek++
    }
  }

  return stats
}
