import type { Draft, DraftsData } from "./types"

/** 選択した下書きを取り除き、出典URLを自動再生成防止リストへ移す。dataは呼び出し側で永続化する。 */
export function dismissDraftsInData(data: DraftsData, ids: ReadonlySet<string>): number {
  let dismissed = 0
  const dismissedUrls = new Set(data.dismissedSourceUrls ?? [])
  const remaining: Draft[] = []

  for (const draft of data.drafts) {
    if (!ids.has(draft.id)) {
      remaining.push(draft)
      continue
    }
    draft.sourceRefs.forEach((ref) => dismissedUrls.add(ref.url))
    dismissed++
  }

  data.drafts = remaining
  data.dismissedSourceUrls = Array.from(dismissedUrls)
  return dismissed
}

/** URL直接入力で新しい下書きを保存できた時だけ、そのURLの削除履歴を解除する。 */
export function clearDismissedUrls(data: DraftsData, urls: ReadonlySet<string>): void {
  data.dismissedSourceUrls = (data.dismissedSourceUrls ?? []).filter((url) => !urls.has(url))
}
