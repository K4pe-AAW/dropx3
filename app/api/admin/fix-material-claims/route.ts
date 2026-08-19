import { NextResponse } from "next/server"
import { mutateArticles } from "@/lib/storage"

/**
 * 一時admin API。lib/ai-draft.tsの素材/機能捏造バグ(2026-08-19発見)により本番公開済みだった
 * 3記事の該当段落を、元記事に実在する情報のみを使った表現に書き換える。単一トランザクション。
 * 使用後に削除すること。
 */
const FIXES: { id: string; oldParagraph: string; newParagraph: string }[] = [
  {
    id: "c729084007f725268ca8c6882ad1bee4",
    oldParagraph:
      "デザインだけでなく、素材や機能性も見逃せません。例えば、耐久性に優れたGORE-TEX素材を使用したアイテムもラインナップに含まれているとのこと。これにより、秋冬の寒い季節でも快適に過ごせること間違いなしです。エヴァンゲリオンのファンだけでなく、ストリートファッションを楽しむ人々にも愛されるアイテムが揃っています。",
    newParagraph:
      "グラフィック使いのアイテムだけでなく、コレクション全体を通してエヴァンゲリオンの世界観を落とし込んだデザインが揃っているのも見どころです。サードインパクトを描いたグラフィックTシャツなど、シリーズを象徴するモチーフが随所に散りばめられています。エヴァンゲリオンのファンだけでなく、ストリートファッションを楽しむ人々にも愛されるアイテムが揃っています。",
  },
  {
    id: "423f8647ac5e1650c24695e19de9be5d",
    oldParagraph:
      "ナイキのエアマックスシリーズはその履き心地の良さでも知られています。特にゴアテックス素材を使用しているため、雨の日でも安心して履けるのがポイント。これからの季節、突然の雨にも対応できるスニーカーは貴重です。普段使いはもちろん、アウトドアシーンでも活躍してくれることでしょう。",
    newParagraph:
      "ナイキのエアマックスシリーズはその履き心地の良さでも知られています。今回のポルカドット柄は遊び心のある差し色として効いていて、シンプルなアウトソールとのコントラストも楽しめる仕上がりです。普段使いはもちろん、季節の変わり目のスタイリングにも取り入れやすい一足です。",
  },
  {
    id: "cf79f3d31c177f005646a4fe356af342",
    oldParagraph:
      "具体的なアイテム情報はまだ明らかにされていませんが、ティンバーランドの特徴的な素材や機能性が活かされることは間違いありません。例えば、GORE-TEXやVibramソールなど、高機能な仕様が採用される可能性もあり、機能美が魅力の一つです。これまでのコラボと同様に、実用性とデザイン性が両立するアイテムが期待できそうです。",
    newParagraph:
      "具体的なアイテム情報はまだ明らかにされていませんが、ティンバーランドならではの機能性とKvi Babaのアートワークがどう組み合わさるのか、その仕上がりに注目が集まっています。これまでのコラボと同様に、実用性とデザイン性が両立するアイテムが期待できそうです。",
  },
]

export async function POST() {
  const results: { id: string; ok: boolean; reason?: string }[] = []

  const result = await mutateArticles((data) => {
    const next = { ...data, articles: data.articles.map((a) => {
      const fix = FIXES.find((f) => f.id === a.id)
      if (!fix) return a
      const idx = a.bodyParagraphs.indexOf(fix.oldParagraph)
      if (idx === -1) {
        results.push({ id: a.id, ok: false, reason: "paragraph not found (already changed?)" })
        return a
      }
      const newBody = [...a.bodyParagraphs]
      newBody[idx] = fix.newParagraph
      results.push({ id: a.id, ok: true })
      return { ...a, bodyParagraphs: newBody, updatedAt: new Date().toISOString() }
    }) }
    return next
  })

  return NextResponse.json({ results, totalArticles: result.articles.length })
}
