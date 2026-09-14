import { test } from "node:test"
import assert from "node:assert/strict"
import { STANDARD_ARTICLE_BODY_GUIDELINE, VINTAGE_ARTICLE_BODY_GUIDELINE } from "./article-writing-guidelines"

test("通常記事は2〜3段落・400〜600字を基準にする", () => {
  assert.match(STANDARD_ARTICLE_BODY_GUIDELINE, /2〜3段落/)
  assert.match(STANDARD_ARTICLE_BODY_GUIDELINE, /400〜600字/)
  assert.match(STANDARD_ARTICLE_BODY_GUIDELINE, /価格・発売日・販売先/)
  assert.match(STANDARD_ARTICLE_BODY_GUIDELINE, /\[アイテム情報\].*含めない/)
})

test("古着記事は商品情報を残して原則2段落にする", () => {
  assert.match(VINTAGE_ARTICLE_BODY_GUIDELINE, /原則2段落/)
  assert.match(VINTAGE_ARTICLE_BODY_GUIDELINE, /購入判断に必要な事実は省略しない/)
})
