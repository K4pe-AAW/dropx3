import { readDrafts, getAllArticles, mutateDrafts } from "./storage"

export type DedupeSummary = {
  checked: number
  removed: number
  removedTitles: string[]
}

/**
 * 下書きのsourceRefsが、既に公開済み記事(articles.json)と同じURLを指していれば、その下書きを削除する。
 *
 * 個別公開(app/api/drafts/[id]/publish)は「記事を作成」→「下書きを削除」の2段階の書き込みで、
 * 前者が成功した直後に後者がBlobの書き込み競合等で失敗すると、記事は公開済みなのに元の下書きが
 * drafts.jsonに残ってしまう。エラー時にユーザーが「公開する」を再度押すと、残った下書きから
 * もう1本記事が生成され、同一動画/記事から複数の重複記事が生まれる(2026-08-20に実際に多数発生
 * ・確認した不具合)。この関数はその後始末として、記事化済みの下書きを1日1回のcronで掃除する
 * 安全網。個別公開・まとめて公開のコード自体は変更していない(2段階書き込み自体は残る)。
 */
export async function dedupeDraftsAgainstArticles(): Promise<DedupeSummary> {
  const [{ drafts }, articles] = await Promise.all([readDrafts(), getAllArticles()])
  const publishedUrls = new Set(articles.flatMap((a) => a.sourceRefs.map((r) => r.url)))

  const toRemove = drafts.filter((d) => d.sourceRefs.some((r) => publishedUrls.has(r.url)))
  const removeIds = new Set(toRemove.map((d) => d.id))

  if (removeIds.size > 0) {
    await mutateDrafts((data) => {
      data.drafts = data.drafts.filter((d) => !removeIds.has(d.id))
      return data
    })
  }

  return { checked: drafts.length, removed: toRemove.length, removedTitles: toRemove.map((d) => d.title) }
}
