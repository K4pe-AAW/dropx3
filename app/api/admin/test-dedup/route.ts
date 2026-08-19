import { NextResponse } from "next/server"
import { addDrafts, getAllArticles, generateId, readDrafts } from "@/lib/storage"
import { Draft } from "@/lib/types"

/** 後片付け用: テストで作ったダミー下書き(タイトルに"重複排除テスト"を含むもの)のID一覧を返す */
export async function GET() {
  const { drafts } = await readDrafts()
  const testDrafts = drafts.filter((d) => d.title.includes("重複排除テスト") || d.brands.includes("TestBrand"))
  return NextResponse.json({ count: testDrafts.length, ids: testDrafts.map((d) => d.id), titles: testDrafts.map((d) => d.title) })
}

/**
 * 一時admin API。addDrafts()のタイトル重複排除ロジックを実データで検証する。
 * ①公開済み記事と同じタイトルの下書きを投入 → skippedになるはず
 * ②ダミータイトルの下書きを2連投 → 2件目がskippedになるはず(下書き同士の重複)
 * 使用後に削除すること。
 */
export async function POST() {
  const articles = await getAllArticles()
  const existingTitle = articles[0]?.title ?? "テスト記事タイトル"

  function makeDraft(title: string, sourceUrl: string): Draft {
    return {
      id: generateId(`${sourceUrl}-test-dedup`),
      status: "pending",
      title,
      excerpt: "重複排除ロジックのテスト用ダミー",
      bodyParagraphs: ["テスト段落"],
      category: "tops",
      brands: ["TestBrand"],
      tags: [],
      suggestedAffiliateSearch: [],
      sourceRefs: [{ name: "test", url: sourceUrl }],
      createdAt: new Date().toISOString(),
    }
  }

  // ① 公開済み記事と同じタイトル(URLは別)
  const result1 = await addDrafts([makeDraft(existingTitle, "https://example.com/test-dedup-1")], {
    knownTitles: new Set(articles.map((a) => a.title)),
  })

  // ② ダミータイトルの下書きを2連投(1件目→保存、2件目→タイトル一致でスキップされるはず)
  const dummyTitle = `重複排除テスト用ダミータイトル-${Date.now()}`
  const result2a = await addDrafts([makeDraft(dummyTitle, "https://example.com/test-dedup-2a")])
  const result2b = await addDrafts([makeDraft(dummyTitle, "https://example.com/test-dedup-2b")])

  return NextResponse.json({
    test1_knownTitleFromArticle: { existingTitle, ...result1, expected: "saved:0, skipped:1" },
    test2a_firstDummy: { ...result2a, expected: "saved:1, skipped:0" },
    test2b_secondDummySameTitle: { ...result2b, expected: "saved:0, skipped:1" },
  })
}
