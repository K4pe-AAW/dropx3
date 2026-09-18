"use client"

import { useEffect, useRef, useState } from "react"
import { AffiliateLink, OfficialLink, PurchaseChannelInfo } from "@/lib/types"
import { AFFILIATE_REL, affiliateSearchQuery, isSafeExternalUrl, sanitizeAffiliateLinks } from "@/lib/affiliate"
import { ExternalLinkIcon } from "@/components/icons"
import { siteConfig } from "@/lib/site-config"
import { trackEvent, classifyAffiliateNetwork, linkDomain } from "@/lib/analytics"

type Row = {
  label: string
  url: string
  description?: string
  isAd: boolean
  retailer: string
  itemName?: string
  saleMethod?: PurchaseChannelInfo["saleMethod"]
  date?: string
  isPrimaryOfficial?: boolean
}

const SAFARI_PROMPT_SHOWN_KEY = "dropx3-safari-purchase-prompt-shown-v1"

/** Safari本体だけを対象にする。iOS版Chrome/Firefox/Edgeやアプリ内WebViewは含めない。 */
export function isSafariUserAgent(userAgent: string): boolean {
  return /Safari\//.test(userAgent) && /Version\//.test(userAgent) &&
    !/(?:Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS|SamsungBrowser|Android)/.test(userAgent)
}

const SALE_METHOD_LABEL: Record<PurchaseChannelInfo["saleMethod"], string> = {
  regular: "通常販売",
  lottery: "抽選",
  unknown: "販売方法未確認",
}

function normalizedUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ""
    return parsed.toString().replace(/\/$/, "")
  } catch {
    return url.replace(/\/$/, "")
  }
}

export function officialSiteSearchUrl(articleTitle: string, brand?: string, itemName?: string): string {
  const subject = itemName?.trim() || articleTitle.trim()
  const brandName = brand?.trim()
  const subjectIncludesBrand = brandName
    ? subject.toLocaleLowerCase().includes(brandName.toLocaleLowerCase())
    : false
  const query = [subjectIncludesBrand ? undefined : brandName, subject, "公式"].filter(Boolean).join(" ")
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

export function isDirectOfficialSiteUrl(url: string): boolean {
  if (!isSafeExternalUrl(url)) return false
  const hostname = new URL(url).hostname.toLocaleLowerCase().replace(/^www\./, "")
  return ![
    "google.com",
    "youtube.com",
    "youtu.be",
    "instagram.com",
    "x.com",
    "twitter.com",
    "tiktok.com",
    "facebook.com",
  ].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
}

/**
 * 公式リンクとアフィリエイトリンクを1つの「販売店舗・オンラインリンク」ブロックにまとめて表示する。
 * PRリンクにはrel="sponsored"と控えめなPR表記を付け、非PRリンクとの扱いの違いは維持したまま
 * 見た目だけ統一する(uptodate.tokyo的な、見出しバー+リンク一覧のレイアウト)。
 * 「公式サイトで探す」は必ず先頭に置き、確認済みのブランド/店舗公式URLがあればそこへ直接つなぐ。
 * 公式URLが無い場合だけ、ドメインを推測せずGoogle検索へフォールバックする。その後に残りの
 * 確認済み公式リンク、最後に広告リンクを並べる。
 */
export function PurchaseLinks({
  officialLinks,
  affiliateLinks,
  purchaseChannels = [],
  articleId,
  articleTitle,
  brand,
  contentType,
}: {
  officialLinks: OfficialLink[]
  affiliateLinks: AffiliateLink[]
  purchaseChannels?: PurchaseChannelInfo[]
  articleId: string
  articleTitle: string
  brand?: string
  contentType?: string
}) {
  const [showSafariPrompt, setShowSafariPrompt] = useState(false)
  const officialDepartureAtRef = useRef<number | null>(null)
  const promptShownRef = useRef(false)
  const safeOfficial = officialLinks.filter(
    (link, index, links) =>
      isSafeExternalUrl(link.url) &&
      links.findIndex((candidate) =>
        isSafeExternalUrl(candidate.url) && normalizedUrl(candidate.url) === normalizedUrl(link.url)
      ) === index
  )
  const safeAffiliate = sanitizeAffiliateLinks(affiliateLinks)
  const primaryItemName = safeAffiliate.map((link) => affiliateSearchQuery(link.url)).find(Boolean)

  const affiliateRows: Row[] = safeAffiliate.map((l) => {
    const itemName = affiliateSearchQuery(l.url)
    return {
      label: l.retailer || l.label,
      url: l.url,
      description: [itemName ? `「${itemName}」で検索` : l.label !== l.retailer ? l.label : null, l.price]
        .filter(Boolean)
        .join(" ・ ") || undefined,
      isAd: true,
      retailer: l.retailer,
      itemName,
    }
  })
  const directOfficial = safeOfficial.find((link) => isDirectOfficialSiteUrl(link.url))
  const officialSearchUrl = officialSiteSearchUrl(articleTitle, brand, primaryItemName)
  const primaryOfficialUrl = directOfficial?.url ?? officialSearchUrl
  const safeChannels = purchaseChannels.filter((channel, index, channels) => {
    if (!channel.retailerName.trim()) return false
    const key = channel.url && isSafeExternalUrl(channel.url)
      ? normalizedUrl(channel.url)
      : `${channel.retailerName.trim().toLocaleLowerCase()}|${channel.saleMethod}|${channel.date ?? ""}`
    return channels.findIndex((candidate) => {
      if (!candidate.retailerName.trim()) return false
      const candidateKey = candidate.url && isSafeExternalUrl(candidate.url)
        ? normalizedUrl(candidate.url)
        : `${candidate.retailerName.trim().toLocaleLowerCase()}|${candidate.saleMethod}|${candidate.date ?? ""}`
      return candidateKey === key
    }) === index
  })
  const consumedChannels = new Set<number>()

  function matchingChannel(link: OfficialLink): PurchaseChannelInfo | undefined {
    const linkUrl = normalizedUrl(link.url)
    const linkLabel = link.label.toLocaleLowerCase()
    const index = safeChannels.findIndex((channel, i) => {
      if (consumedChannels.has(i)) return false
      const sameUrl = channel.url && isSafeExternalUrl(channel.url) && normalizedUrl(channel.url) === linkUrl
      const retailer = channel.retailerName.trim().toLocaleLowerCase()
      return Boolean(sameUrl || (retailer && linkLabel.includes(retailer)))
    })
    if (index < 0) return undefined
    consumedChannels.add(index)
    return safeChannels[index]
  }

  const primaryChannel = directOfficial ? matchingChannel(directOfficial) : undefined
  const officialRows: Row[] = [
    {
      label: "公式サイトで探す",
      url: primaryOfficialUrl,
      description: directOfficial
        ? `確認済み公式ページ${primaryChannel ? `（${primaryChannel.retailerName}）` : ""}を開く`
        : "Googleでブランド公式情報を検索",
      isAd: false,
      retailer: "",
      saleMethod: primaryChannel?.saleMethod,
      date: primaryChannel?.date,
      isPrimaryOfficial: true,
    },
    ...safeOfficial
      .filter((link) => link.url !== primaryOfficialUrl)
      .map((l) => {
        const channel = matchingChannel(l)
        return {
          label: l.label,
          url: l.url,
          isAd: false,
          retailer: "",
          saleMethod: channel?.saleMethod,
          date: channel?.date,
        }
      }),
  ]
  const remainingChannels = safeChannels
    .map((channel, index) => ({ channel, index }))
    .filter(({ index }) => !consumedChannels.has(index))
  const officialChannelRows: Row[] = remainingChannels
    .filter(({ channel }) => channel.channelType === "official")
    .map(({ channel }) => ({
      label: channel.retailerName,
      url: channel.url && isSafeExternalUrl(channel.url) ? channel.url : "",
      isAd: false,
      retailer: "",
      saleMethod: channel.saleMethod,
      date: channel.date,
    }))
  const secondaryChannelRows: Row[] = remainingChannels
    .filter(({ channel }) => channel.channelType === "secondary")
    .map(({ channel }) => ({
      label: channel.retailerName,
      url: channel.url && isSafeExternalUrl(channel.url) ? channel.url : "",
      isAd: false,
      retailer: "",
      saleMethod: channel.saleMethod,
      date: channel.date,
    }))

  const showGroupLabels = affiliateRows.length > 0

  useEffect(() => {
    if (affiliateRows.length === 0 || !isSafariUserAgent(window.navigator.userAgent)) return

    try {
      if (window.sessionStorage.getItem(SAFARI_PROMPT_SHOWN_KEY) === "1") {
        promptShownRef.current = true
        return
      }
    } catch {
      // sessionStorageが使えない場合も、同じページ内ではrefで二重表示を防ぐ。
    }

    const showAfterReturn = () => {
      const departedAt = officialDepartureAtRef.current
      if (
        promptShownRef.current ||
        departedAt === null ||
        document.visibilityState !== "visible" ||
        Date.now() - departedAt < 800
      ) return

      promptShownRef.current = true
      officialDepartureAtRef.current = null
      try {
        window.sessionStorage.setItem(SAFARI_PROMPT_SHOWN_KEY, "1")
      } catch {
        // 保存できなくても表示は続行する。
      }
      setShowSafariPrompt(true)
      trackEvent("purchase_prompt_view", {
        article_id: articleId,
        article_title: articleTitle,
        browser_family: "safari",
        affiliate_count: affiliateRows.length,
      })
    }

    document.addEventListener("visibilitychange", showAfterReturn)
    window.addEventListener("focus", showAfterReturn)
    return () => {
      document.removeEventListener("visibilitychange", showAfterReturn)
      window.removeEventListener("focus", showAfterReturn)
    }
  }, [affiliateRows.length, articleId, articleTitle])

  function handleRowClick(row: Row, placement: "article_body" | "official_return_prompt" = "article_body") {
    if (row.isAd) {
      trackEvent("affiliate_click", {
        affiliate_network: classifyAffiliateNetwork(row.retailer),
        item_name: row.itemName ?? articleTitle,
        item_brand: brand,
        placement,
        article_id: articleId,
        article_title: articleTitle,
        content_type: contentType,
        link_url: row.url,
      })
    } else {
      const safari = isSafariUserAgent(window.navigator.userAgent)
      if (row.isPrimaryOfficial && safari && affiliateRows.length > 0 && !promptShownRef.current) {
        officialDepartureAtRef.current = Date.now()
      }
      trackEvent("outbound_click", {
        link_domain: linkDomain(row.url),
        link_url: row.url,
        placement: "article_body",
        article_id: articleId,
        browser_family: safari ? "safari" : "other",
        link_role: row.isPrimaryOfficial ? "primary_official" : "official",
      })
    }
  }

  return (
    <>
      <div id="purchase-links" className="my-8 scroll-mt-24 overflow-hidden rounded-xl border border-border">
      <div className="bg-accent px-4 py-3">
        <h2 className="text-sm font-bold text-accent-foreground">
          {primaryItemName ? `「${primaryItemName}」の販売情報・購入先` : "販売情報・購入先"}
        </h2>
      </div>
      {showGroupLabels && (
        <p className="border-b border-border bg-secondary/20 px-4 py-2 text-xs text-muted-foreground">
          売り切れ・サイズ切れの場合は、中古・マーケットプレイスもあわせてチェックしてみてください。
        </p>
      )}
      <LinkRowGroup
        label={showGroupLabels || safeChannels.length > 0 ? "公式・正規販売店" : undefined}
        rows={[...officialRows, ...officialChannelRows]}
        onRowClick={handleRowClick}
      />
      {secondaryChannelRows.length > 0 && (
        <LinkRowGroup label="セレクト店・二次流通" rows={secondaryChannelRows} onRowClick={handleRowClick} />
      )}
      {affiliateRows.length > 0 && (
        <div>
          <div className="bg-secondary/10 px-4 pt-2 text-[11px] font-bold tracking-wide text-muted-foreground/70">
            中古・マーケットプレイスで探す
          </div>
          <div className="divide-y divide-border">
            {affiliateRows.map((row, i) => (
              <AffiliateRowLink key={i} row={row} articleId={articleId} onRowClick={handleRowClick} />
            ))}
          </div>
        </div>
      )}
      {safeAffiliate.length > 0 && (
        <p className="border-t border-border bg-secondary/30 px-4 py-2 text-[11px] text-muted-foreground">
          「PR」表記のリンクは広告を含みます。購入・申込によって{siteConfig.name}に紹介料が入る場合があります。
        </p>
      )}
      </div>
      {showSafariPrompt && affiliateRows.length > 0 && (
        <SafariPurchasePrompt
          rows={affiliateRows.slice(0, 2)}
          onClose={() => setShowSafariPrompt(false)}
          onRowClick={(row) => {
            handleRowClick(row, "official_return_prompt")
            setShowSafariPrompt(false)
          }}
        />
      )}
    </>
  )
}

function SafariPurchasePrompt({
  rows,
  onClose,
  onRowClick,
}: {
  rows: Row[]
  onClose: () => void
  onRowClick: (row: Row) => void
}) {
  return (
    <aside
      role="dialog"
      aria-live="polite"
      aria-label="購入先の案内"
      className="fixed inset-x-3 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-border bg-background p-4 shadow-2xl"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="購入先の案内を閉じる"
        className="absolute right-3 top-2 text-xl leading-none text-muted-foreground hover:text-foreground"
      >
        ×
      </button>
      <p className="pr-8 text-sm font-black">公式情報は確認できましたか？</p>
      <p className="mt-1 text-xs text-muted-foreground">価格や在庫を購入先で比較できます。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {rows.map((row) => (
          <a
            key={`${row.retailer}-${row.url}`}
            href={row.url}
            target="_blank"
            rel={AFFILIATE_REL}
            onClick={() => onRowClick(row)}
            className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition-opacity hover:opacity-80"
          >
            {row.retailer || row.label}で見る
          </a>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">PR：購入により紹介料が入る場合があります。</p>
    </aside>
  )
}

function RowContent({ row }: { row: Row }) {
  return (
    <>
      <span className="inline-flex items-center gap-1 font-bold text-foreground underline decoration-accent decoration-2 underline-offset-2">
        {row.label}
        {row.url && <ExternalLinkIcon className="size-3.5 shrink-0 opacity-60" />}
      </span>
      {row.saleMethod && (
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
            row.saleMethod === "lottery" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          {SALE_METHOD_LABEL[row.saleMethod]}
        </span>
      )}
      {row.date && <span className="text-xs text-muted-foreground">{row.date}</span>}
      {row.description && <span className="text-xs text-muted-foreground">{row.description}</span>}
      {row.isAd && (
        <span className="ml-auto shrink-0 text-[10px] font-bold tracking-wide text-muted-foreground/60">PR</span>
      )}
    </>
  )
}

/**
 * 広告行のみ、50%以上表示された状態が1秒続いたらaffiliate_impressionを送る(CTR算出用)。
 * 要素ごとに1ページ1回のみ。記事あたりの広告行数はたかだか数件のため、追加のサンプリング
 * 制御は行わない(トラフィックが大きく伸びた場合に検討)。
 */
function AffiliateRowLink({
  row,
  articleId,
  onRowClick,
}: {
  row: Row
  articleId: string
  onRowClick: (row: Row) => void
}) {
  const anchorRef = useRef<HTMLAnchorElement>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const el = anchorRef.current
    if (!el) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (firedRef.current) return
        if (entry.isIntersecting) {
          timer = setTimeout(() => {
            if (firedRef.current) return
            firedRef.current = true
            trackEvent("affiliate_impression", {
              affiliate_network: classifyAffiliateNetwork(row.retailer),
              item_name: row.itemName ?? row.label,
              placement: "article_body",
              article_id: articleId,
            })
            observer.disconnect()
          }, 1000)
        } else if (timer) {
          clearTimeout(timer)
          timer = null
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => {
      if (timer) clearTimeout(timer)
      observer.disconnect()
    }
  }, [row.retailer, row.label, row.itemName, articleId])

  return (
    <a
      ref={anchorRef}
      href={row.url}
      target="_blank"
      rel={AFFILIATE_REL}
      onClick={() => onRowClick(row)}
      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-3 transition-colors hover:bg-secondary/50"
    >
      <RowContent row={row} />
    </a>
  )
}

function LinkRowGroup({
  label,
  rows,
  onRowClick,
}: {
  label?: string
  rows: Row[]
  onRowClick: (row: Row) => void
}) {
  return (
    <div>
      {label && (
        <div className="bg-secondary/10 px-4 pt-2 text-[11px] font-bold tracking-wide text-muted-foreground/70">{label}</div>
      )}
      <div className="divide-y divide-border">
        {rows.map((row, i) =>
          row.url ? (
            <a
              key={i}
              href={row.url}
              target="_blank"
              rel={row.isAd ? AFFILIATE_REL : "noopener noreferrer"}
              onClick={() => onRowClick(row)}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-3 transition-colors hover:bg-secondary/50"
            >
              <RowContent row={row} />
            </a>
          ) : (
            <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-3">
              <RowContent row={row} />
            </div>
          )
        )}
      </div>
    </div>
  )
}
