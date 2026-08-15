import { NextResponse } from "next/server"
import { readDrafts, writeDrafts } from "@/lib/storage"

/**
 * 一時API(使用後削除)。YouTube収集を有効化した際、旧コード(shorts未対応)で作られた既存の
 * pending下書きにはsuggestedYoutubeVideoId/suggestedCoverImage/suggestedOfficialLinksが
 * 付いていないため、単一トランザクションで後付けする。既に値がある下書きは上書きしない。
 */
function extractYoutubeVideoId(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== "www.youtube.com" && parsed.hostname !== "youtube.com") return undefined
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v") ?? undefined
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/)
    if (shortsMatch) return shortsMatch[1]
    return undefined
  } catch {
    return undefined
  }
}

export async function POST() {
  const data = await readDrafts()
  let patched = 0
  const patchedTitles: string[] = []

  for (const draft of data.drafts) {
    if (draft.status !== "pending") continue
    if (draft.suggestedYoutubeVideoId) continue
    const ytRef = draft.sourceRefs.find((r) => extractYoutubeVideoId(r.url))
    if (!ytRef) continue
    const videoId = extractYoutubeVideoId(ytRef.url)!
    draft.suggestedYoutubeVideoId = videoId
    draft.suggestedCoverImage = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    draft.suggestedOfficialLinks = [{ label: `${ytRef.name}で見る`, url: ytRef.url }]
    patched++
    patchedTitles.push(draft.title)
  }

  if (patched > 0) await writeDrafts(data)

  return NextResponse.json({ ok: true, patched, patchedTitles })
}
