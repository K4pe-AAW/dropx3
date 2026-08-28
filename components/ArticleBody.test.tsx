import { test } from "node:test"
import assert from "node:assert/strict"
import { ARTICLE_BODY_CLASS_NAME } from "./ArticleBody"

test("公開記事本文は日本語の文節境界で自然に改行する", () => {
  assert.match(ARTICLE_BODY_CLASS_NAME, /(?:^|\s)text-wrap-phrase(?:\s|$)/)
})
