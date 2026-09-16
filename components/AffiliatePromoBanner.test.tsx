import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { buildRakutenSearchLink } from "@/lib/affiliate"
import { AffiliatePromoBanner } from "./AffiliatePromoBanner"

test("AffiliatePromoBanner: VIDOの価格・PR表示・楽天アフィリエイト属性を出す", () => {
  const href = buildRakutenSearchLink("MYTREX VIDO MT-VD22B").url
  const html = renderToStaticMarkup(<AffiliatePromoBanner href={href} />)

  assert.match(html, /MYTREX/)
  assert.match(html, /VIDO/)
  assert.match(html, /16,280円（税込）/)
  assert.match(html, />PR</)
  assert.match(html, /楽天市場で見る/)
  assert.match(html, /rpx\.a8\.net/)
  assert.match(html, /rel="sponsored nofollow noopener noreferrer"/)
})
