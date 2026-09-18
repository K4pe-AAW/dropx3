import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { ORBIS_MR_A8_PROMO } from "@/lib/affiliate"
import { HorizontalAffiliateBanner } from "./HorizontalAffiliateBanner"

test("HorizontalAffiliateBanner: オルビス ミスターの横長公式素材とPR属性を出す", () => {
  const html = renderToStaticMarkup(<HorizontalAffiliateBanner />)

  assert.match(html, /オルビス ミスター/)
  assert.match(html, /PR/)
  assert.match(html, /width="468"/)
  assert.match(html, /height="60"/)
  assert.match(html, new RegExp(ORBIS_MR_A8_PROMO.imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("&", "(?:&amp;|&)")))
  assert.match(html, new RegExp(ORBIS_MR_A8_PROMO.trackingPixelUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("&", "(?:&amp;|&)")))
  assert.match(html, /rel="sponsored nofollow noopener noreferrer"/)
})
