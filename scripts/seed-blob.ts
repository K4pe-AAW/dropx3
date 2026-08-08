import { loadEnvLocal } from "./load-env"
loadEnvLocal()

import fs from "fs"
import path from "path"
import { writeArticles, writeDrafts } from "../lib/storage"
import type { ArticlesData, DraftsData } from "../lib/types"

/**
 * ローカルのdata/articles.json・data/drafts.jsonの内容を、初回だけVercel Blobへアップロードする。
 * BLOB_READ_WRITE_TOKENを.env.localに設定した後、一度だけ実行する
 * (`npx tsx scripts/seed-blob.ts`)。それ以降のデータはBlob側が正になる。
 */
async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN が未設定です。.env.local に追加してから実行してください。")
    process.exit(1)
  }

  const articlesPath = path.join(process.cwd(), "data", "articles.json")
  const draftsPath = path.join(process.cwd(), "data", "drafts.json")

  const articles: ArticlesData = JSON.parse(fs.readFileSync(articlesPath, "utf-8"))
  const drafts: DraftsData = JSON.parse(fs.readFileSync(draftsPath, "utf-8"))

  console.log(`記事 ${articles.articles.length}件、下書き ${drafts.drafts.length}件をBlobへアップロードします...`)

  await writeArticles(articles)
  await writeDrafts(drafts)

  console.log("完了しました。以後はBlob側のデータが本体になります。")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
