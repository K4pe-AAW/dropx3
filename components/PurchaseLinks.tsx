"use client"

import { useEffect, useRef } from "react"
import { AffiliateLink, OfficialLink } from "@/lib/types"
import { AFFILIATE_REL, isSafeExternalUrl, sanitizeAffiliateLinks } from "@/lib/affiliate"
import { ExternalLinkIcon } from "@/components/icons"
import { siteConfig } from "@/lib/site-config"
import { trackEvent, classifyAffiliateNetwork, linkDomain } from "@/lib/analytics"

type Row = {
  label: string
  url: string
  description?: string
  isAd: boolean
  retailer: string
}

/**
 * 公式リンクとアフィリエイトリンクを1つの「販売店舗・オンラインリンク」ブロックにまとめて表示する。
 * PRリンクにはrel="sponsored"と控えめなPR表記を付け、非PRリンクとの扱いの違いは維持したまま
 * 見た目だけ統一する(uptodate.tokyo的な、見出しバー+リンク一覧のレイアウト)。
 * 両方の種類が揃っている場合のみ「公式」「中古・マーケットプレイス」に分けて見出しを出す
 * (BUY導線の強化: 売り切れ時に中古を探すという次のアクションを示す)。
 */
export function PurchaseLinks({
  officialLinks,
  affiliateLinks,
  articleId,
  articleTitle,
  brand,
}: {
  officialLinks: OfficialLink[]
  affiliateLinks: AffiliateLink[]
  articleId: string
  articleTitle: string
  brand?: string
}) {
  const safeOfficial = officialLinks.filter((l) => isSafeExternalUrl(l.url))
  const safeAffiliate = sanitizeAffiliateLinks(affiliateLinks)

  const affiliateRows: Row[] = safeAffiliate.map((l) => ({
    label: l.retailer || l.label,
    url: l.url,
    description: [l.label !== l.retailer ? l.label : null, l.price].filter(Boolean).join(" ・ ") || undefined,
    isAd: true,
    retailer: l.retailer,
  }))
  const officialRows: Row[] = safeOfficial.map((l) => ({ label: l.label, url: l.url, isAd: false, retailer: "" }))

  if (affiliateRows.length === 0 && officialRows.length === 0) return null

  const showGroupLabels = affiliateRows.length > 0 && officialRows.length > 0

  function handleRowClick(row: Row) {
    if (row.isAd) {
      trackEvent("affiliate_click", {
        affiliate_network: classifyAffiliateNetwork(row.retailer),
        item_name: articleTitle,
        item_brand: brand,
        placement: "article_body",
        article_id: articleId,
        article_title: articleTitle,
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
    <div className="my-8 overflow-hidden rounded-xl border border-border">
      <div className="bg-accent px-4 py-3">
        <h2 className="text-sm font-bold text-accent-foreground">販売店舗・オンラインリンク（随時更新）</h2>
      </div>
      {showGroupLabels && (
        <p className="border-b border-border bg-secondary/20 px-4 py-2 text-xs text-muted-foreground">
          売り切れ・サイズ切れの場合は、中古・マーケットプレイスもあわせてチェックしてみてください。
        </p>
      )}
      {affiliateRows.length > 0 && (
        <div>
          {showGroupLabels && (
            <div className="bg-secondary/10 px-4 pt-2 text-[11px] font-bold tracking-wide text-muted-foreground/70">
              中古・マーケットプレイスで探す
            </div>
          )}
          <div className="divide-y divide-border">
            {affiliateRows.map((row, i) => (
              <AffiliateRowLink key={i} row={row} articleId={articleId} onRowClick={handleRowClick} />
            ))}
          </div>
        </div>
      )}
      {officialRows.length > 0 && (
        <LinkRowGroup
          label={showGroupLabels ? "公式・店舗情報" : undefined}
          rows={officialRows}
          onRowClick={handleRowClick}
        />
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
              item_name: row.label,
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
  }, [row.retailer, row.label, articleId])

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
