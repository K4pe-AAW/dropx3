import { NextRequest, NextResponse } from "next/server"
import { putBlobFile } from "@/lib/storage"

/**
 * 一時admin API。画像未設定ドラフトの一括ソーシング用に、確認済みブランド公式画像を
 * Blobへアップロードして公開URLを返すだけの単機能ルート。使用後削除。
 */
function extFromMime(type: string): string {
  if (type === "image/png") return "png"
  if (type === "image/webp") return "webp"
  return "jpg"
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "invalid form data" }, { status: 400 })

  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "fileが必要です" }, { status: 400 })

  const tag = String(form.get("tag") ?? "draft").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 60) || "draft"
  const buffer = Buffer.from(await file.arrayBuffer())
  const pathname = `images/drafts/${tag}-${Date.now()}.${extFromMime(file.type)}`
  const url = await putBlobFile(pathname, buffer, file.type || "image/jpeg")

  return NextResponse.json({ url })
}
