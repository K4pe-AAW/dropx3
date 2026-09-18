import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { ORBIS_MR_A8_PROMO, ZIGEN_FACE_GEL_A8_PROMO } from "@/lib/affiliate"
import { HorizontalAffiliateBanner, selectHorizontalPromo } from "./HorizontalAffiliateBanner"

test("HorizontalAffiliateBanner: オルビス ミスターの横長公式素材とPR属性を出す", () => {
  const html = renderToStaticMarkup(<HorizontalAffiliateBanner promo={ORBIS_MR_A8_PROMO} />)

  assert.match(html, /オルビス ミスター/)
  assert.match(html, /PR/)
  assert.match(html, /width="468"/)
  assert.match(html, /height="60"/)
  assert.match(html, /min-h-\[60px\] w-full/)
  assert.match(html, new RegExp(ORBIS_MR_A8_PROMO.imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("&", "(?:&amp;|&)")))
  assert.match(html, new RegExp(ORBIS_MR_A8_PROMO.trackingPixelUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("&", "(?:&amp;|&)")))
  assert.match(html, /rel="sponsored nofollow noopener noreferrer"/)
})

test("HorizontalAffiliateBanner: ZIGENの横長公式素材とPR属性を出す", () => {
  const html = renderToStaticMarkup(<HorizontalAffiliateBanner promo={ZIGEN_FACE_GEL_A8_PROMO} />)

  assert.match(html, /ZIGEN/)
  assert.match(html, /PR/)
  assert.match(html, /width="468"/)
  assert.match(html, /height="60"/)
  assert.match(html, new RegExp(ZIGEN_FACE_GEL_A8_PROMO.imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("&", "(?:&amp;|&)")))
  assert.match(html, new RegExp(ZIGEN_FACE_GEL_A8_PROMO.trackingPixelUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("&", "(?:&amp;|&)")))
  assert.match(html, /rel="sponsored nofollow noopener noreferrer"/)
})

test("selectHorizontalPromo: 保存した次回indexから交互に選ぶ", () => {
  assert.equal(selectHorizontalPromo("0").promo.itemName, ORBIS_MR_A8_PROMO.itemName)
  assert.equal(selectHorizontalPromo("0").nextIndex, 1)
  assert.equal(selectHorizontalPromo("1").promo.itemName, ZIGEN_FACE_GEL_A8_PROMO.itemName)
  assert.equal(selectHorizontalPromo("1").nextIndex, 0)
})

test("selectHorizontalPromo: 初回だけ乱数で開始案件を分散する", () => {
  assert.equal(selectHorizontalPromo(null, 0).promo.itemName, ORBIS_MR_A8_PROMO.itemName)
  assert.equal(selectHorizontalPromo(null, 0.999).promo.itemName, ZIGEN_FACE_GEL_A8_PROMO.itemName)
})
