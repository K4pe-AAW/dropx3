import type { ProductCard } from "@/lib/source-watch/present"
import { isThisWeek, isToday, pickRelevantDeadline } from "@/lib/source-watch/countdown"
import { LOTTERY_LIKE_SALE_METHODS } from "@/lib/source-watch/labels"

export type SocialQuickFilter = "newToday" | "raffle" | "dueToday" | "dueThisWeek" | "release" | "restock" | "event"

export function applySocialQuickFilter(cards: ProductCard[], filter: SocialQuickFilter | "all"): ProductCard[] {
  if (filter === "all") return cards
  return cards.filter((c) => {
    const social = c.product.social
    if (!social) return false
    switch (filter) {
      case "newToday":
        return isToday(new Date(c.product.firstDetectedAt))
      case "raffle":
        return Boolean(social.saleMethod && LOTTERY_LIKE_SALE_METHODS.includes(social.saleMethod))
      case "dueToday": {
        const d = pickRelevantDeadline(social)
        return d ? isToday(d.at) : false
      }
      case "dueThisWeek": {
        const d = pickRelevantDeadline(social)
        return d ? isThisWeek(d.at) : false
      }
      case "release":
        return social.postTypes.includes("release")
      case "restock":
        return social.postTypes.includes("restock")
      case "event":
        return social.postTypes.includes("event") || social.postTypes.includes("popup")
      default:
        return true
    }
  })
}
