import type { Metadata } from "next"
import { EditorialListingPage } from "@/components/EditorialListingPage"

export const metadata: Metadata = {
  title: "編集部コラム",
  description: "DROP DROP DROP編集部が、ストリートファッションの背景や気になる動きを掘り下げます。",
}
export const dynamic = "force-dynamic"

export default function ColumnPage() {
  return <EditorialListingPage contentType="COLUMN" />
}
