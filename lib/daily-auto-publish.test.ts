import test from "node:test"
import assert from "node:assert/strict"
import {
  ARTICLES_PER_AUTO_PUBLISH_RUN,
  ARTICLES_PER_YOUTUBE_MIX_CYCLE,
  MIN_ARTICLES_PER_TWO_HOUR_SLOT,
  TARGET_YOUTUBE_ARTICLES_PER_MIX_CYCLE,
  buildRequiredAffiliateLinks,
  galleryCandidatesForPublish,
  jstSlotKey,
  jstYoutubeMixCycleKey,
  isSameProductAssetFamily,
  orderAutoPublishCandidates,
  uniqueGalleryCandidates,
} from "./daily-auto-publish"
import type { Draft } from "./types"

test("各2時間枠の最低公開目標は3記事", () => {
  assert.equal(ARTICLES_PER_AUTO_PUBLISH_RUN, 3)
  assert.equal(MIN_ARTICLES_PER_TWO_HOUR_SLOT, 3)
})

test("6記事につきYouTube記事1件を目安にする", () => {
  assert.equal(ARTICLES_PER_YOUTUBE_MIX_CYCLE, 6)
  assert.equal(TARGET_YOUTUBE_ARTICLES_PER_MIX_CYCLE, 1)
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

test("JSTの同じ2時間帯は再試行しても1つの公開枠として扱う", () => {
  assert.equal(jstSlotKey(new Date("2026-08-28T23:00:00Z")), "2026-08-29-08-throughput-v4")
  assert.equal(jstSlotKey(new Date("2026-08-28T23:59:59Z")), "2026-08-29-08-throughput-v4")
  assert.equal(jstSlotKey(new Date("2026-08-29T01:00:00Z")), "2026-08-29-10-throughput-v4")
  assert.equal(jstSlotKey(new Date("2026-08-29T15:00:00Z")), "2026-08-30-00-throughput-v4")
})

test("JSTの連続する2枠をYouTube混在用の6記事周期として扱う", () => {
  assert.equal(jstYoutubeMixCycleKey(new Date("2026-08-28T23:00:00Z")), "2026-08-29-08-youtube-mix-v1")
  assert.equal(jstYoutubeMixCycleKey(new Date("2026-08-29T01:59:59Z")), "2026-08-29-08-youtube-mix-v1")
  assert.equal(jstYoutubeMixCycleKey(new Date("2026-08-29T03:00:00Z")), "2026-08-29-12-youtube-mix-v1")
})

test("6記事周期にYouTubeが無ければYouTube候補を先にし、1件公開済みなら通常候補だけにする", () => {
  const normal = { id: "normal", suggestedYoutubeVideoId: undefined } as Draft
  const youtube = { id: "youtube", suggestedYoutubeVideoId: "abcdefghijk" } as Draft
  assert.deepEqual(orderAutoPublishCandidates([normal, youtube], 0).map((draft) => draft.id), ["youtube", "normal"])
  assert.deepEqual(orderAutoPublishCandidates([normal, youtube], 1).map((draft) => draft.id), ["normal"])
})

test("髭ミルクのラジオ下書きは自動公開候補から除外する", () => {
  const radio = {
    id: "radio",
    title: "髭ミルク・嫁ヘルツが贈るラジオの魅力",
    excerpt: "モーニンググッドの最新回",
    bodyParagraphs: ["ポッドキャストです"],
    suggestedYoutubeVideoId: "abcdefghijk",
    sourceRefs: [{ name: "髭ミルク", url: "https://www.youtube.com/watch?v=abcdefghijk" }],
  } as Draft
  const product = {
    id: "product",
    title: "KITH NEW BALANCEを開封・レビュー",
    excerpt: "商品紹介",
    bodyParagraphs: ["スニーカーを確認"],
    suggestedYoutubeVideoId: "lmnopqrstuv",
    sourceRefs: [{ name: "髭ミルク", url: "https://www.youtube.com/watch?v=lmnopqrstuv" }],
  } as Draft
  assert.deepEqual(orderAutoPublishCandidates([radio, product], 0).map((draft) => draft.id), ["product"])
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

test("自動公開は安全な別カットを追加最大12枚まで保持する", () => {
  const gallery = Array.from({ length: 15 }, (_, index) => ({
    url: `https://img.example.com/products/airmax90-view-${index + 1}.jpg`,
    alt: `別カット${index + 1}`,
  }))
  const selected = uniqueGalleryCandidates(
    "https://img.example.com/products/airmax90-cover.jpg",
    [
      ...gallery,
      { url: "https://img.example.com/products/unrelated-view-1.jpg", alt: "別商品" },
    ]
  )

  assert.equal(selected.length, 12)
  assert.equal(selected.some((image) => image.url.includes("unrelated")), false)
})

test("公開直前に確認済み公式リンクから見つけた画像だけ追加候補へ加える", () => {
  const draft = {
    id: "official-images",
    title: "Air Max 90",
    suggestedGalleryImages: [
      { url: "https://cdn.example.com/products/airmax90-side.jpg", alt: "既存" },
    ],
    suggestedOfficialLinks: [
      { label: "Nike公式", url: "https://www.nike.example/products/airmax90" },
    ],
  } as Draft

  assert.deepEqual(
    galleryCandidatesForPublish(draft, "https://www.nike.example/products/airmax90", [
      "https://cdn.example.com/products/airmax90-back.jpg",
    ]).map((image) => image.url),
    [
      "https://cdn.example.com/products/airmax90-side.jpg",
      "https://cdn.example.com/products/airmax90-back.jpg",
    ]
  )
  assert.deepEqual(
    galleryCandidatesForPublish(draft, "https://media.example/articles/airmax90", [
      "https://media.example/images/airmax90-back.jpg",
    ]).map((image) => image.url),
    ["https://cdn.example.com/products/airmax90-side.jpg"]
  )
})
