import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { readJson, ARTICLES_PATH, DRAFTS_PATH, SCHEDULED_PATH, CRAWL_SOURCES_PATH } from "@/lib/storage"

export const dynamic = "force-dynamic"

const BACKUP_TARGETS = [ARTICLES_PATH, DRAFTS_PATH, SCHEDULED_PATH, CRAWL_SOURCES_PATH]

/**
 * 記事・下書き・予約・収集元の日次スナップショット。Vercel Blobには版管理が無いため、
 * 誤操作や不具合で本体が壊れた場合に直近の状態へ手動で戻せるよう、日付付きパスへ
 * コピーを残すだけの一方向バックアップ(このバックアップ自体を読み書きする機能は作らない)。
 * 外部スケジューラ用の認証はdedupe-drafts等の既存cronと同じパターン。
 */
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy

  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const dateKey = new Date().toISOString().slice(0, 10)
  const backedUp: string[] = []

  try {
    for (const sourcePath of BACKUP_TARGETS) {
      const data = await readJson<unknown>(sourcePath, null)
      if (data === null) continue
      const backupPath = `backups/${dateKey}/${sourcePath.replace(/^data\//, "")}`
      await put(backupPath, JSON.stringify(data, null, 2), {
        access: "public",
        contentType: "application/json",
        allowOverwrite: true,
        cacheControlMaxAge: 60,
      })
      backedUp.push(backupPath)
    }
    return NextResponse.json({ ok: true, date: dateKey, backedUp })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "バックアップに失敗しました" },
      { status: 500 }
    )
  }
}
