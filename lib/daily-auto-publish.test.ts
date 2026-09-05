import test from "node:test"
import assert from "node:assert/strict"
import {
  ARTICLES_PER_AUTO_PUBLISH_RUN,
  MAX_YOUTUBE_ARTICLES_PER_RUN,
  autoPublishBlockReasons,
  buildRequiredAffiliateLinks,
  jstSlotKey,
  isSameProductAssetFamily,
  uniqueGalleryCandidates,
} from "./daily-auto-publish"

test("1日の自動公開上限は2記事", () => {
  assert.equal(ARTICLES_PER_AUTO_PUBLISH_RUN, 2)
})

test("YouTube記事は自動公開せず個別確認へ回す", () => {
  assert.equal(MAX_YOUTUBE_ARTICLES_PER_RUN, 0)
})

test("自動公開はZOZOTOWNを要求せず5店舗のリンクを生成する", () => {
  const previous = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG
  process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG = "dropx3-test-22"
  try {
    assert.deepEqual(buildRequiredAffiliateLinks("Nike Air Max 90").map((link) => link.retailer), [
      "楽天市場",
      "メルカリ",
      "SNKRDUNK",
      "Amazon",
      "Yahoo!ショッピング",
    ])
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG
    else process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG = previous
  }
})

test("同じJST日付は1つの公開枠として扱う", () => {
  assert.equal(jstSlotKey(new Date("2026-08-28T23:00:00Z")), "2026-08-29")
  assert.equal(jstSlotKey(new Date("2026-08-29T11:00:00Z")), "2026-08-29")
  assert.equal(jstSlotKey(new Date("2026-08-29T15:00:00Z")), "2026-08-30")
})

const safeDraft = {
  id: "safe",
  status: "pending" as const,
  title: "公式発表された新作スニーカー",
  excerpt: "公式情報をもとに紹介します。",
  bodyParagraphs: ["ブランドが発売を発表しました。"],
  category: "sneaker" as const,
  contentType: "BUY" as const,
  informationStatus: "official" as const,
  brands: ["Example"],
  tags: ["新作"],
  suggestedAffiliateSearch: ["Example Model 1"],
  sourceRefs: [{ name: "Example公式", url: "https://example.com/news/model-1" }],
  createdAt: "2026-09-05T00:00:00.000Z",
  suggestedCoverImage: "https://images.example.com/model-1.jpg",
  suggestedOfficialLinks: [{ label: "公式サイト", url: "https://example.com/products/model-1" }],
}

test("公式情報・公式画像・商品検索語が揃う通常記事だけ自動公開できる", () => {
  assert.deepEqual(autoPublishBlockReasons(safeDraft), [])
})

test("Goss!p・PR・SNAP・権利元不明画像は人間確認へ回す", () => {
  assert.ok(autoPublishBlockReasons({ ...safeDraft, informationStatus: "rumor", title: "Goss!p｜新作か" }).length > 0)
  assert.ok(autoPublishBlockReasons({ ...safeDraft, isSponsored: true }).length > 0)
  assert.ok(autoPublishBlockReasons({ ...safeDraft, contentType: "SNAP" }).length > 0)
  assert.ok(autoPublishBlockReasons({ ...safeDraft, suggestedCoverImage: "https://media.example.net/photo.jpg" }).length > 0)
})

test("追加画像はカバーと同一のサイズ違いを除外し、候補がある分だけ採用する", () => {
  assert.deepEqual(
    uniqueGalleryCandidates("https://img.example.com/products/airmax90-front-1200x800.jpg?w=1200", [
      { url: "https://img.example.com/products/airmax90-front-300x200.jpg?w=300", alt: "重複" },
      { url: "https://img.example.com/products/airmax90-side.jpg", alt: "側面" },
      { url: "https://img.example.com/products/unrelated-side.jpg", alt: "別商品" },
    ]),
    [
      { url: "https://img.example.com/products/airmax90-side.jpg", alt: "側面" },
    ]
  )
})

test("同じページ由来でも商品識別子が一致しない画像は追加しない", () => {
  assert.equal(
    isSameProductAssetFamily(
      "https://example.com/uploads/2026/08/ennoy-tokyo-black-main.jpg",
      "https://example.com/uploads/2026/08/new-era-cap-main.jpg"
    ),
    false
  )
  assert.equal(
    isSameProductAssetFamily(
      "https://example.com/uploads/2026/08/ennoy-tokyo-black-main.jpg",
      "https://example.com/uploads/2026/08/ennoy-tokyo-black-side.jpg"
    ),
    true
  )
})
