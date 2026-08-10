import { AffiliateLink, OfficialLink } from "@/lib/types"
import { AFFILIATE_REL, isSafeExternalUrl, sanitizeAffiliateLinks } from "@/lib/affiliate"
import { ExternalLinkIcon } from "@/components/icons"
import { siteConfig } from "@/lib/site-config"

type Row = {
  label: string
  url: string
  description?: string
  isAd: boolean
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
}: {
  officialLinks: OfficialLink[]
  affiliateLinks: AffiliateLink[]
}) {
  const safeOfficial = officialLinks.filter((l) => isSafeExternalUrl(l.url))
  const safeAffiliate = sanitizeAffiliateLinks(affiliateLinks)

  const affiliateRows: Row[] = safeAffiliate.map((l) => ({
    label: l.retailer || l.label,
    url: l.url,
    description: [l.label !== l.retailer ? l.label : null, l.price].filter(Boolean).join(" ・ ") || undefined,
    isAd: true,
  }))
  const officialRows: Row[] = safeOfficial.map((l) => ({ label: l.label, url: l.url, isAd: false }))

  if (affiliateRows.length === 0 && officialRows.length === 0) return null

  const showGroupLabels = affiliateRows.length > 0 && officialRows.length > 0

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
      {affiliateRows.length > 0 && <LinkRowGroup label={showGroupLabels ? "中古・マーケットプレイスで探す" : undefined} rows={affiliateRows} />}
      {officialRows.length > 0 && <LinkRowGroup label={showGroupLabels ? "公式・店舗情報" : undefined} rows={officialRows} />}
      {safeAffiliate.length > 0 && (
        <p className="border-t border-border bg-secondary/30 px-4 py-2 text-[11px] text-muted-foreground">
          「PR」表記のリンクは広告を含みます。購入・申込によって{siteConfig.name}に紹介料が入る場合があります。
        </p>
      )}
    </div>
  )
}

function LinkRowGroup({ label, rows }: { label?: string; rows: Row[] }) {
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
            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-3 transition-colors hover:bg-secondary/50"
          >
            <span className="inline-flex items-center gap-1 font-bold text-foreground underline decoration-accent decoration-2 underline-offset-2">
              {row.label}
              <ExternalLinkIcon className="size-3.5 shrink-0 opacity-60" />
            </span>
            {row.description && <span className="text-xs text-muted-foreground">{row.description}</span>}
            {row.isAd && (
              <span className="ml-auto shrink-0 text-[10px] font-bold tracking-wide text-muted-foreground/60">PR</span>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
