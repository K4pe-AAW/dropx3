import { NextResponse } from "next/server"
import { getArticleById } from "@/lib/storage"
import { recordEngagement, type EngagementEventName } from "@/lib/engagement"

const EVENTS = new Set<EngagementEventName>(["article_view", "article_read_complete", "affiliate_click"])

export async function POST(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite === "cross-site") {
    return NextResponse.json({ error: "cross-site request rejected" }, { status: 403 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  const articleId = typeof (body as { articleId?: unknown })?.articleId === "string"
    ? (body as { articleId: string }).articleId
    : ""
  const event = (body as { event?: EngagementEventName })?.event
  if (!articleId || articleId.length > 80 || !event || !EVENTS.has(event)) {
    return NextResponse.json({ error: "invalid event" }, { status: 400 })
  }
  if (!(await getArticleById(articleId))) {
    return NextResponse.json({ error: "article not found" }, { status: 404 })
  }
  await recordEngagement(articleId, event)
  return NextResponse.json({ ok: true })
}
