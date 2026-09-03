import { NextResponse } from "next/server"
import { get, head } from "@vercel/blob"
import { DRAFTS_PATH, mutateDrafts, readDrafts, readJson, writeJson } from "@/lib/storage"
import type { Draft, DraftsData } from "@/lib/types"
import { normalizeGosspLabel } from "@/lib/gossp-migration"

const RECOVERY_IDS = [
  "e95be7ca52a8b2f7a8ebbee5ddce8c92",
  "daed06fbcc1652e019fdfe628322876b",
  "4ea1c357f1a2810de4537f7ea0f69499",
  "315438edc850cd456ab4247a87d1ed3b",
] as const

const BACKUP_PATHS = ["backups/2026-09-03/drafts.json", "backups/2026-09-02/drafts.json"]

/** 復元完了までの診断用。public/private originの到達可否とETagだけを返し、本文は返さない。 */
export async function GET() {
  const metadata = await head(DRAFTS_PATH).catch(() => null)
  const publicRead = await get(DRAFTS_PATH, { access: "public", useCache: false }).catch(() => null)
  const privateRead = await get(DRAFTS_PATH, { access: "private", useCache: false }).catch(() => null)
  await publicRead?.stream?.cancel().catch(() => undefined)
  await privateRead?.stream?.cancel().catch(() => undefined)
  return NextResponse.json({
    head: metadata?.etag ?? null,
    public: publicRead?.blob.etag ?? null,
    private: privateRead?.blob.etag ?? null,
    privateStatus: privateRead?.statusCode ?? null,
  })
}

/** 今回の一括公開障害で消えた4件だけを日次バックアップから復元する一度限りの保全エンドポイント。 */
export async function POST() {
  const current = await readDrafts()
  const recoveryCandidates = new Map<string, Draft>()

  for (const pathname of BACKUP_PATHS) {
    const backup = await readJson<DraftsData>(pathname, { drafts: [] })
    for (const draft of backup.drafts) {
      if (RECOVERY_IDS.includes(draft.id as (typeof RECOVERY_IDS)[number]) && !recoveryCandidates.has(draft.id)) {
        recoveryCandidates.set(draft.id, draft)
      }
    }
  }

  const backupStamp = new Date().toISOString().replaceAll(":", "-")
  await writeJson(`backups/manual-youtube-bulk-recovery-${backupStamp}/drafts-before.json`, current)

  const next = await mutateDrafts((data) => {
    const existing = new Set(data.drafts.map((draft) => draft.id))
    const restored = RECOVERY_IDS.flatMap((id) => {
      const candidate = recoveryCandidates.get(id)
      return candidate && !existing.has(id) ? [candidate] : []
    })
    return normalizeGosspLabel({ ...data, drafts: [...restored, ...data.drafts] }).value
  })

  const finalIds = new Set(next.drafts.map((draft) => draft.id))
  const originallyPresent = new Set(current.drafts.map((draft) => draft.id))
  return NextResponse.json({
    ok: true,
    restored: RECOVERY_IDS.filter((id) => finalIds.has(id) && !originallyPresent.has(id)),
    alreadyPresent: RECOVERY_IDS.filter((id) => originallyPresent.has(id)),
    missingFromBackups: RECOVERY_IDS.filter((id) => !recoveryCandidates.has(id)),
  })
}
