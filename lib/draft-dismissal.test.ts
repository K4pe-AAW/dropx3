import assert from "node:assert/strict"
import test from "node:test"
import { clearDismissedUrls, dismissDraftsInData } from "./draft-dismissal"
import type { Draft, DraftsData } from "./types"

function draft(id: string, url: string): Draft {
  return {
    id,
    status: "pending",
    title: id,
    excerpt: "",
    bodyParagraphs: [],
    category: "apparel",
    brands: [],
    tags: [],
    suggestedAffiliateSearch: [],
    sourceRefs: [{ name: "source", url }],
    createdAt: "2026-08-27T00:00:00.000Z",
  }
}

test("削除した下書きは本文を除去し、出典URLだけを再生成防止リストへ残す", () => {
  const data: DraftsData = { drafts: [draft("remove", "https://example.com/a"), draft("keep", "https://example.com/b")] }

  const count = dismissDraftsInData(data, new Set(["remove"]))

  assert.equal(count, 1)
  assert.deepEqual(data.drafts.map((d) => d.id), ["keep"])
  assert.deepEqual(data.dismissedSourceUrls, ["https://example.com/a"])
})

test("同じURLを複数回削除してもブロック履歴は重複しない", () => {
  const data: DraftsData = {
    drafts: [draft("remove", "https://example.com/a")],
    dismissedSourceUrls: ["https://example.com/a"],
  }

  dismissDraftsInData(data, new Set(["remove"]))

  assert.deepEqual(data.dismissedSourceUrls, ["https://example.com/a"])
})

test("URL直接入力で保存できたURLだけ削除履歴を解除する", () => {
  const data: DraftsData = {
    drafts: [],
    dismissedSourceUrls: ["https://example.com/a", "https://example.com/b"],
  }

  clearDismissedUrls(data, new Set(["https://example.com/a"]))

  assert.deepEqual(data.dismissedSourceUrls, ["https://example.com/b"])
})
