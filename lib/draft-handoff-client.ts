"use client"

import type { Draft } from "./types"

const PREFIX = "draft-handoff:"

/**
 * 下書き生成直後にrouter.pushする先(/admin/drafts/[id])は、Blobの書き込み伝播遅延で
 * 別リクエストからの読み取りがまだ古いスナップショットのことがある(storage.tsのgetDraftById参照)。
 * 生成した本人はレスポンスで既に最新のdraftを持っているので、それをこの場でsessionStorageへ
 * 一時的に渡し、遷移先で改めてサーバーへ問い合わせずそのまま初期表示に使う(使い捨て)。
 */
export function stashDraftHandoff(draft: Draft) {
  try {
    sessionStorage.setItem(`${PREFIX}${draft.id}`, JSON.stringify(draft))
  } catch {
    // sessionStorageが使えない環境(プライベートブラウズ等)では諦める。遷移先のポーリングにフォールバックする
  }
}

export function takeDraftHandoff(id: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${id}`)
    if (!raw) return null
    sessionStorage.removeItem(`${PREFIX}${id}`)
    return JSON.parse(raw) as Draft
  } catch {
    return null
  }
}
