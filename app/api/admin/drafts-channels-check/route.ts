import { NextResponse } from "next/server"
import { getPendingDrafts } from "@/lib/storage"

export async function GET() {
  const drafts = await getPendingDrafts()
  const withChannels = drafts
    .filter((d) => d.suggestedPurchaseChannels && d.suggestedPurchaseChannels.length > 0)
    .map((d) => ({ id: d.id, title: d.title, sourceName: d.sourceRefs[0]?.name, channels: d.suggestedPurchaseChannels }))
  return NextResponse.json({ total: drafts.length, withChannelsCount: withChannels.length, withChannels })
}
