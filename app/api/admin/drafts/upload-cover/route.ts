import { NextRequest, NextResponse } from "next/server"
import { readDrafts, writeDrafts, putBlobFile } from "@/lib/storage"

/**
 * 一時admin API(画像ソーシング一括反映用)。ローカルで検証済みの画像ファイルを
 * multipart/form-dataで直接受け取り、Blobへアップロードして該当下書きの
 * suggestedCoverImageに設定する。1リクエスト=1ファイル。使用後削除。
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

  const data = await readDrafts()
  const draft = data.drafts.find((d) => d.id === id)
  if (!draft) return NextResponse.json({ error: "下書きが見つかりません", url }, { status: 404 })
  draft.suggestedCoverImage = url
  await writeDrafts(data)

  return NextResponse.json({ ok: true, url })
}
