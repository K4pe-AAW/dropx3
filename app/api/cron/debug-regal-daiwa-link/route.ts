import { NextRequest, NextResponse } from "next/server"
import { readArticles, mutateArticles } from "@/lib/storage"

/**
 * 一時作業用。regal×DAIWA PIER39ローファー記事(GSC実測: impressions254・掲載順位10.39で
 * ページ1に肉薄)と、同ブランドの他記事(daiwa-pier39の新作コレクション)に相互内部リンクを追加する。
 * tor-ultra-lo記事で行ったのと同じ手法(§10 SEO戦略参照)。確認後すぐ削除する。
 */
const TARGET_SLUG = "regalとダイワピア39が贈る新感覚ローファー登場-a24d3055"
const PARTNER_SLUG = "daiwa-pier39の新作-2026年秋冬コレクションが登場-e207fc42"

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const action = req.nextUrl.searchParams.get("action") ?? "check"
  const { articles } = await readArticles()
  const target = articles.find((a) => a.slug === TARGET_SLUG)
  const partner = articles.find((a) => a.slug === PARTNER_SLUG)

  if (action === "check") {
    return NextResponse.json({
      target: target ? { id: target.id, title: target.title, relatedArticles: target.relatedArticles ?? [] } : null,
      partner: partner ? { id: partner.id, title: partner.title, relatedArticles: partner.relatedArticles ?? [] } : null,
    })
  }

  if (action === "add-related-link") {
    if (!target || !partner) {
      return NextResponse.json({ error: "対象記事が見つかりません", target: !!target, partner: !!partner }, { status: 404 })
    }
    await mutateArticles((data) => {
      const t = data.articles.find((a) => a.id === target.id)
      const p = data.articles.find((a) => a.id === partner.id)
      if (t && !(t.relatedArticles ?? []).some((r) => r.slug === p!.slug)) {
        t.relatedArticles = [...(t.relatedArticles ?? []), { title: p!.title, slug: p!.slug }]
      }
      if (p && !(p.relatedArticles ?? []).some((r) => r.slug === t!.slug)) {
        p.relatedArticles = [...(p.relatedArticles ?? []), { title: t!.title, slug: t!.slug }]
      }
      return data
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 })
}
