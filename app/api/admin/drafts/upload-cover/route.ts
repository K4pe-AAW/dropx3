import { NextRequest, NextResponse } from "next/server"
import { putBlobFile } from "@/lib/storage"

/**
 * 一時admin API(画像ソーシング一括反映用)。ローカルで検証済みの画像ファイルを
 * multipart/form-dataで受け取りBlobへアップロードし、URLだけを返す。
 * drafts.jsonへの反映はここでは行わない(前回、1件ずつ即書き込みして競合で
 * 7件消えた反省から、アップロードと反映を分離した。反映は set-covers でまとめて1回)。
 * 使用後削除。
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "invalid form data" }, { status: 400 })

  const id = form.get("id")
  const file = form.get("file")
  if (typeof id !== "string" || !id) return NextResponse.json({ error: "idが必要です" }, { status: 400 })
  if (!(file instanceof File)) return NextResponse.json({ error: "fileが必要です" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg"
  const url = await putBlobFile(`images/drafts/${id}.${ext}`, buffer, file.type || "image/jpeg")

  return NextResponse.json({ ok: true, id, url })
}
