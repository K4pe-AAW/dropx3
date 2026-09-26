import { readJson } from "./storage"

export const BACKUP_HEALTH_PATH = "data/backup-health.json"

export type BackupHealth = {
  completedAt?: string
  date?: string
  backedUp?: string[]
  totalBytes?: number
  sourceBytes?: Record<string, number>
  error?: string
}

export async function readBackupHealth(): Promise<BackupHealth> {
  return readJson<BackupHealth>(BACKUP_HEALTH_PATH, {})
}

export function backupAgeHours(state: BackupHealth, now = new Date()): number | null {
  if (!state.completedAt) return null
  const timestamp = Date.parse(state.completedAt)
  return Number.isFinite(timestamp) ? Math.max(0, Math.round((now.getTime() - timestamp) / 36e5)) : null
}
