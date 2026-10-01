import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { buildRakutenSearchLink, MUSCLE_DELI_A8_PROMO, ULTORA_A8_PROMO } from "@/lib/affiliate"
import { AffiliatePromoBanner } from "./AffiliatePromoBanner"

test("AffiliatePromoBanner: ULTORA、MYTREX、マッスルデリを独立したPR枠で表示する", () => {
  const mytrexHref = buildRakutenSearchLink("MYTREX VIDO MT-VD22B").url
  const html = renderToStaticMarkup(<AffiliatePromoBanner mytrexHref={mytrexHref} />)

  assert.match(html, /ULTORA/)
  assert.match(html, /MYTREX/)
  assert.match(html, /VIDO/)
  assert.match(html, /16,280円（税込）/)
  assert.match(html, /マッスルデリ/)
  assert.match(html, /高たんぱく宅配食/)
  assert.match(html, new RegExp(MUSCLE_DELI_A8_PROMO.placementId))
  assert.match(html, /PR/)
  assert.match(html, new RegExp(ULTORA_A8_PROMO.imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("&", "(?:&amp;|&)")))
  assert.match(html, new RegExp(ULTORA_A8_PROMO.trackingPixelUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("&", "(?:&amp;|&)")))
  assert.match(html, new RegExp(MUSCLE_DELI_A8_PROMO.imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("&", "(?:&amp;|&)")))
  assert.match(html, new RegExp(MUSCLE_DELI_A8_PROMO.trackingPixelUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("&", "(?:&amp;|&)")))
  assert.match(html, /px\.a8\.net/)
  assert.match(html, /mytrex-vido-official\.jpg/)
  assert.match(html, /rel="sponsored nofollow noopener noreferrer"/)
  assert.ok(html.indexOf("ULTORA") < html.indexOf("MYTREX"))
  assert.ok(html.indexOf("MYTREX") < html.indexOf("マッスルデリ"))
})
