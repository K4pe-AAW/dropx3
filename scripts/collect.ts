import { loadEnvLocal } from "./load-env"
loadEnvLocal()

import { runCollectAndDraft } from "../lib/pipeline"

async function main() {
  console.log("収集を開始します...")
  const summary = await runCollectAndDraft()
  console.log(
    `取得: ${summary.fetched}件 / 下書き追加: ${summary.drafted}件 / 重複スキップ: ${summary.skipped}件`
  )
  summary.errors.forEach((e) => console.warn("  エラー:", e))
  console.log("\nhttp://localhost:3002/admin でレビュー・公開してください。")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
