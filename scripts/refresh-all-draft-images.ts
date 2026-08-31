import { refreshAllDraftImages } from "../lib/draft-image-refresh"

if (process.env.RUN_REFRESH_ALL_DRAFT_IMAGES === "1") {
  refreshAllDraftImages()
    .then((summary) => console.log(JSON.stringify({ event: "complete", ...summary })))
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
