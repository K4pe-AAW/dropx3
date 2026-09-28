import { syncTypefullyX } from "../lib/typefully-sync"

const apiKey = process.env.TYPEFULLY_API_KEY ?? ""

syncTypefullyX({ apiKey })
  .then((result) => {
    console.log(JSON.stringify(result))
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Typefully sync failed")
    process.exitCode = 1
  })
