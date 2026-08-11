import { NextRequest, NextResponse } from "next/server"
import { getProduct, updateProduct } from "@/lib/source-watch/storage"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 })
  const updated = await updateProduct(id, { reviewStatus: "ignored" })
  return NextResponse.json(updated)
}
