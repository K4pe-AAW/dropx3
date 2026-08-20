import { NextResponse } from "next/server"
import { mutateDrafts } from "@/lib/storage"
import type { Category } from "@/lib/types"

export const dynamic = "force-dynamic"

/** 特定の下書きIDのcategoryを1件だけ修正する一時API(誤判定データの手動修正用) */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const id = typeof body?.id === "string" ? body.id : ""
  const category = typeof body?.category === "string" ? (body.category as Category) : undefined
  if (!id || !category) return NextResponse.json({ error: "id and category required" }, { status: 400 })

  let found = false
  await mutateDrafts((data) => {
    const draft = data.drafts.find((d) => d.id === id)
    if (draft) {
      draft.category = category
      found = true
    }
    return data
  })

  if (!found) return NextResponse.json({ error: "draft not found" }, { status: 404 })
  return NextResponse.json({ ok: true, id, category })
}
