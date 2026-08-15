declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export type AffiliateNetwork = "amazon" | "rakuten" | "other"

/**
 * 計測するカスタムイベントの一覧。イベント名とパラメータの組み合わせをここで型として縛り、
 * 呼び出し側(各コンポーネント)がtrackEvent()経由で送るパラメータを間違えられないようにする。
 */
export type AnalyticsEvent =
  | {
      name: "affiliate_click"
      params: {
        affiliate_network: AffiliateNetwork
        item_name: string
        item_brand?: string
        placement: "article_body"
        article_id: string
        article_title: string
        link_url: string
      }
    }
  | {
      name: "outbound_click"
      params: {
        link_domain: string
        link_url: string
        placement: "article_body"
        article_id: string
      }
    }
  | {
      name: "article_read_complete"
      params: {
        article_id: string
        article_title: string
        category: string
        brand?: string
      }
    }
  | {
      name: "search_submit"
      params: {
        search_term: string
        result_count: number
      }
    }
  | {
      name: "search_result_select"
      params: {
        search_term: string
        result_position: number
        article_id: string
      }
    }
  | {
      name: "brand_select"
      params: {
        brand?: string
        category?: string
        placement?: "header_nav" | "mobile_nav" | "sidebar" | "article_badge"
      }
    }
  | {
      name: "affiliate_impression"
      params: {
        affiliate_network: AffiliateNetwork
        item_name: string
        placement: "article_body"
        article_id: string
      }
    }

export type AnalyticsEventName = AnalyticsEvent["name"]
export type AnalyticsEventParams<N extends AnalyticsEventName> = Extract<AnalyticsEvent, { name: N }>["params"]

const MAX_PARAM_VALUE_LENGTH = 100
const MAX_PARAMS = 25

/**
 * GA4のハード制限(パラメータ値100文字・1イベント25個まで)を呼び出し側が意識しなくて済むように
 * ここで機械的に担保する。特にlib/affiliate.tsの楽天リンクは2段リダイレクトで100文字を
 * 大幅に超えるため、切り詰めずに送るとGA4側で末尾が壊れたpercent-encodingのまま
 * レポートに残ってしまう。
 */
function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined)
  const result: Record<string, unknown> = {}
  for (const [key, value] of entries.slice(0, MAX_PARAMS)) {
    result[key] = typeof value === "string" && value.length > MAX_PARAM_VALUE_LENGTH
      ? value.slice(0, MAX_PARAM_VALUE_LENGTH)
      : value
  }
  return result
}

/**
 * GA4カスタムイベント送信の唯一の窓口。各コンポーネントはwindow.gtagを直接呼ばず、
 * 必ずこの関数を経由する。gtag未定義(広告ブロッカー・スクリプト読み込み前・/admin配下)
 * でも黙ってno-opにする(components/Analytics.tsxと同じ「未設定なら何もしない」方針)。
 * 開発環境ではdebug_modeを自動付与し、GA4のDebugViewでそのまま確認できるようにする。
 */
export function trackEvent<N extends AnalyticsEventName>(name: N, params: AnalyticsEventParams<N>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return

  const debugParams = process.env.NODE_ENV !== "production" ? { debug_mode: true } : {}
  window.gtag("event", name, sanitizeParams({ ...params, ...debugParams }))
}

const NETWORK_KEYWORDS: [string, AffiliateNetwork][] = [
  ["楽天", "rakuten"],
  ["rakuten", "rakuten"],
  ["amazon", "amazon"],
  ["アマゾン", "amazon"],
]

/**
 * AffiliateLink.retailerは管理画面(PublishForm)での自由入力のため厳密なenumではない。
 * 既知の店舗名を部分一致(大小文字無視)で拾い、それ以外はotherに落とす。実データの
 * 表記ゆれ次第で誤分類が起こり得るため、運用しながらNETWORK_KEYWORDSを見直す前提。
 */
export function classifyAffiliateNetwork(retailer: string): AffiliateNetwork {
  const lower = retailer.toLowerCase()
  for (const [keyword, network] of NETWORK_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) return network
  }
  return "other"
}

/** outbound_click/affiliate_clickのlink_domainパラメータ用。パース失敗時は空文字を返す */
export function linkDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ""
  }
}
