"use client"

import { useEffect, useRef } from "react"
import { AffiliateLink, OfficialLink } from "@/lib/types"
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
  articleId,
  articleTitle,
  brand,
  contentType,
}: {
  officialLinks: OfficialLink[]
  affiliateLinks: AffiliateLink[]
  articleId: string
  articleTitle: string
  brand?: string
  contentType?: string
}) {
  const safeOfficial = officialLinks.filter((l) => isSafeExternalUrl(l.url))
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
  const officialRows: Row[] = [
    {
      label: "公式サイトで探す",
      url: primaryOfficialUrl,
      description: directOfficial ? "確認済み公式ページを開く" : "Googleでブランド公式情報を検索",
      isAd: false,
      retailer: "",
    },
    ...safeOfficial
      .filter((link) => link.url !== primaryOfficialUrl)
      .map((l) => ({ label: l.label, url: l.url, isAd: false, retailer: "" })),
  ]

  const showGroupLabels = affiliateRows.length > 0

  function handleRowClick(row: Row) {
    if (row.isAd) {
      trackEvent("affiliate_click", {
        affiliate_network: classifyAffiliateNetwork(row.retailer),
        item_name: row.itemName ?? articleTitle,
        item_brand: brand,
        placement: "article_body",
        article_id: articleId,
        article_title: articleTitle,
        content_type: contentType,
        link_url: row.url,
      })
    } else {
      trackEvent("outbound_click", {
        link_domain: linkDomain(row.url),
        link_url: row.url,
        placement: "article_body",
        article_id: articleId,
      })
    }
  }

  return (
    <div id="purchase-links" className="my-8 scroll-mt-24 overflow-hidden rounded-xl border border-border">
      <div className="bg-accent px-4 py-3">
        <h2 className="text-sm font-bold text-accent-foreground">
          {primaryItemName ? `「${primaryItemName}」の公式サイト・販売先を探す` : "公式サイト・販売先を探す"}
        </h2>
      </div>
      {showGroupLabels && (
        <p className="border-b border-border bg-secondary/20 px-4 py-2 text-xs text-muted-foreground">
          売り切れ・サイズ切れの場合は、中古・マーケットプレイスもあわせてチェックしてみてください。
        </p>
      )}
      <LinkRowGroup
        label={showGroupLabels ? "まず公式サイトで確認" : undefined}
        rows={officialRows}
        onRowClick={handleRowClick}
      />
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
  )
}

function RowContent({ row }: { row: Row }) {
  return (
    <>
      <span className="inline-flex items-center gap-1 font-bold text-foreground underline decoration-accent decoration-2 underline-offset-2">
        {row.label}
        <ExternalLinkIcon className="size-3.5 shrink-0 opacity-60" />
      </span>
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
        {rows.map((row, i) => (
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
        ))}
      </div>
    </div>
  )
}
