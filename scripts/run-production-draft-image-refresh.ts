const endpoint = "https://dropx3.com/api/cron/refresh-draft-images"
const secret = process.env.CRON_SECRET

if (!secret || secret === "[SENSITIVE]") {
  throw new Error("ProductionのCRON_SECRETを安全に読み込めませんでした")
}

async function main() {
  let offset = 0
  const summaries: Array<Record<string, unknown>> = []

  while (true) {
    const url = new URL(endpoint)
    url.searchParams.set("offset", String(offset))
    url.searchParams.set("limit", "20")
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    })
    const body = await response.json() as Record<string, unknown>
    if (!response.ok) throw new Error(`画像再収集APIがHTTP ${response.status}を返しました`)

    const summary = {
      offset: body.offset,
      processed: body.processed,
      updated: body.updated,
      coversAdded: body.coversAdded,
      galleriesRemoved: body.galleriesRemoved,
      duplicateImagesCleared: body.duplicateImagesCleared,
      failures: body.failures,
      backupPath: body.backupPath,
    }
    summaries.push(summary)
    console.log(JSON.stringify(summary))

    if (typeof body.nextOffset !== "number") break
    offset = body.nextOffset
  }

  console.log(JSON.stringify({ event: "complete", batches: summaries.length }))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
