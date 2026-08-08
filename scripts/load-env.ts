import fs from "fs"
import path from "path"

/**
 * scripts/*.ts はNextを介さず`tsx`で直接実行するため、.env.localを自前で読み込む。
 * (Next.jsアプリ本体は`next dev`/`next build`が自動で.env.localを読むので、
 * app/やlib/のコードでこの関数を呼ぶ必要はない)
 */
export function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(file)) return

  const content = fs.readFileSync(file, "utf-8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const eq = trimmed.indexOf("=")
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) process.env[key] = value
  }
}
