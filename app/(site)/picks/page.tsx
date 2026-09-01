import type { Metadata } from "next"
import { EditorialListingPage } from "@/components/EditorialListingPage"

export const metadata: Metadata = {
  title: "EDITOR’S PICKS",
  description: "DROP DROP DROP編集部が選んだ、いま気になるファッションアイテムを紹介します。",
}
export const dynamic = "force-dynamic"

export default function PicksPage() {
  return <EditorialListingPage contentType="PICKS" />
}
