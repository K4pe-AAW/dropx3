import { NextResponse } from "next/server"
import { readDrafts, writeDrafts } from "@/lib/storage"

/**
 * 一時API(使用後削除)。ショート動画は収集対象外にする方針変更を受け、既に収集済みの
 * ショート動画由来のpending下書きを単一トランザクションで削除する。
 */
function isYoutubeShorts(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith("/shorts/")
  } catch {
    return false
  }
}

export async function POST() {
  const data = await readDrafts()
  const before = data.drafts.length
  const removedTitles: string[] = []

  data.drafts = data.drafts.filter((draft) => {
    if (draft.status !== "pending") return true
    const isShorts = draft.sourceRefs.some((r) => isYoutubeShorts(r.url))
    if (isShorts) removedTitles.push(draft.title)
    return !isShorts
  })

  const removed = before - data.drafts.length
  if (removed > 0) await writeDrafts(data)

  return NextResponse.json({ ok: true, removed, removedTitles })
}
