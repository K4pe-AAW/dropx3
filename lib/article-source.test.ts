import assert from "node:assert/strict"
import test from "node:test"
import { isFashionsnapSourced, isPrTimesSourced } from "./article-source"

test("媒体名が変わっても公式ドメインからPR TIMESとFASHIONSNAPを判定する", () => {
  assert.equal(isPrTimesSourced({ sourceRefs: [{ name: "プレスリリース", url: "https://prtimes.jp/main/html/rd/p/1.html" }] }), true)
  assert.equal(isFashionsnapSourced({ sourceRefs: [{ name: "国内媒体", url: "https://www.fashionsnap.com/article/1/" }] }), true)
})

test("ブランド公式記事は制限対象媒体に含めない", () => {
  const official = { sourceRefs: [{ name: "ブランド公式", url: "https://brand.example.com/news" }] }
  assert.equal(isPrTimesSourced(official), false)
  assert.equal(isFashionsnapSourced(official), false)
})
