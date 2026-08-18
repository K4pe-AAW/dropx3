import { NextResponse } from "next/server"
import { mutateArticles } from "@/lib/storage"
import { buildMercariSearchLink } from "@/lib/affiliate"

/**
 * 一時admin API。既存記事にアフィリエイトリンクが無い48件のうち、タイトルから安全に
 * 検索語を特定できた30件へメルカリ検索リンクを一括付与する。単一トランザクション
 * (mutateArticles 1回)で完結させ、既存の「個別publish APIをループで叩かない」原則を踏襲する。
 * 使用後に削除すること。
 */
const ASSIGNMENTS: { id: string; query: string }[] = [
  { id: "10469c48c986a064027c6a1d60542370", query: "X-girl NO COFFEE" },
  { id: "81399d59e7585c931c6f89b5a427bde5", query: "HOKA Tor Ultra Lo" },
  { id: "c169f2bfdf0808002a065661f43d85f2", query: "ジャーナルスタンダード relume チャンピオン" },
  { id: "323590751ffcd0eabc87756675456f04", query: "Nike Mind 001" },
  { id: "f4181953a231d19cb325f6097f138009", query: "Timberland New Era" },
  { id: "58202dc330d9e703659bb3ba2744edcd", query: "Lee 417 EDIFICE" },
  { id: "e42688f8f9286c223f08238054f9824a", query: "'47 サーティワン キャップ" },
  { id: "d9c79566193261e6b0dad110d941b2ad", query: "LOOPWHEELER LOWERCASE スウェット" },
  { id: "4d91f0483f5cbeb9196a30b5b4b55c35", query: "JOURNAL STANDARD relume JAMES FABRIC" },
  { id: "7401f064f7c7e4f3b8255be1fcde585e", query: "BEAMS WILD THINGS" },
  { id: "7031f31dbc6730585ecb254daf345d2d", query: "フィルマークス パプリカ" },
  { id: "bf07369d3a7296f5ca9e1dd20754ae2b", query: "STUSSY always do what you should do" },
  { id: "7564f9b97c5eedff195a08bf44b6d459", query: "FILA Athletics" },
  { id: "cf88337c057c1e3cf69e011493278f25", query: "Timberland TOKYO DESIGN COLLECTIVE" },
  { id: "a6d84b9e5c9bcec5eee78a6622529865", query: "leinwande New Era 9TWENTY" },
  { id: "32a4ea1bb84bede3de6dc75c57a84f19", query: "PRADA パラドックス スウィート ケミストリー" },
  { id: "9d1839a3cd691d4dda430795c8c570e4", query: "Danner Mountain Light" },
  { id: "99da18c4e4cf1be9288e3a284ad219c1", query: "GUIDI Palombaro" },
  { id: "dfcbcc41a579671bf9737f6f9ceb2506", query: "BE@RBRICK KEITH HARING" },
  { id: "3dfb4afa46a86485cfe54c7c1befc9b6", query: "AURALEE ハーフコート" },
  { id: "38b8dc077da425c599059d58e1186644", query: "NICENESS ウォレットチェーン" },
  { id: "ff7665beef22d97371a2a11652e4a087", query: "NICENESS レザージャケット" },
  { id: "465f8da6d8fab63877bdc28aced46700", query: "COVERCHORD Sisi Joia ネックレス" },
  { id: "d5b7d4aa87ea180101017f1bb90d6999", query: "T.T LOT.413" },
  { id: "ca29b4b03502fdb5a6f56df447365275", query: "ENNOY ポケットT" },
  { id: "400527148c9cda51f7b91ea16fcd5e5e", query: "AURALEE ダウンブルゾン" },
  { id: "a707e488959339c527717122b45a87ff", query: "MARKAWARE マウンテンパーカ" },
  { id: "d6420d3868ecef7859ed4af4ed9b767a", query: "ssstein デニムパンツ" },
  { id: "1d6e5a5315ed16984dda9ae88f419f37", query: "CLESSTE ITTI レザーバッグ" },
  { id: "2f9fb35388e234b60594705c3a641042", query: "Zoff MLB" },
]

export async function POST() {
  const results: { id: string; ok: boolean; reason?: string }[] = []

  const updated = await mutateArticles((data) => {
    const next = { ...data, articles: [...data.articles] }
    for (const { id, query } of ASSIGNMENTS) {
      const idx = next.articles.findIndex((a) => a.id === id)
      if (idx === -1) {
        results.push({ id, ok: false, reason: "not found" })
        continue
      }
      const article = next.articles[idx]
      if (article.affiliateLinks && article.affiliateLinks.length > 0) {
        results.push({ id, ok: false, reason: "already has links" })
        continue
      }
      try {
        const link = buildMercariSearchLink(query)
        next.articles[idx] = { ...article, affiliateLinks: [link], updatedAt: new Date().toISOString() }
        results.push({ id, ok: true })
      } catch (e) {
        results.push({ id, ok: false, reason: e instanceof Error ? e.message : "error" })
      }
    }
    return next
  })

  return NextResponse.json({ results, totalArticles: updated.articles.length })
}
