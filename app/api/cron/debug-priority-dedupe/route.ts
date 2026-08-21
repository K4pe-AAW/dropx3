import { NextRequest, NextResponse } from "next/server"
import { addDrafts, readDrafts, removeDraft, generateId } from "@/lib/storage"
import type { Draft } from "@/lib/types"

export const dynamic = "force-dynamic"

const TEST_STYLE_CODE = "DEBUG-TEST-99999"

function makeDraft(sourceName: string, title: string): Draft {
  return {
    id: generateId(`debug-priority-${sourceName}-${Date.now()}-${Math.random()}`),
    status: "pending",
    title,
    excerpt: "優先度重複排除の検証用ダミーです。",
    bodyParagraphs: ["テスト本文です。"],
    category: "sneaker",
    brands: ["DebugBrand"],
    tags: [],
    suggestedAffiliateSearch: [],
    suggestedColorways: [{ colorName: "Test", styleCode: TEST_STYLE_CODE }],
    sourceRefs: [{ name: sourceName, url: `https://example.com/debug-${sourceName}-${Date.now()}` }],
    createdAt: new Date().toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  const legacy = req.headers.get("x-cron-secret")
  const provided = bearer?.replace(/^Bearer\s+/i, "") ?? legacy
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const action = new URL(req.url).searchParams.get("action")

  if (action === "cleanup") {
    const { drafts } = await readDrafts()
    const targets = drafts.filter((d) => d.suggestedColorways?.some((c) => c.styleCode === TEST_STYLE_CODE))
    for (const d of targets) await removeDraft(d.id)
    return NextResponse.json({ removed: targets.length })
  }

  if (action === "peek") {
    const { drafts } = await readDrafts()
    const matching = drafts
      .filter((d) => d.suggestedColorways?.some((c) => c.styleCode === TEST_STYLE_CODE))
      .map((d) => ({ id: d.id, title: d.title, source: d.sourceRefs[0]?.name, createdAt: d.createdAt }))
    return NextResponse.json({ totalDrafts: drafts.length, matching })
  }

  // Step1: FULLRESS由来を先に追加
  const fullress = makeDraft("FULLRESS", "【デバッグ】FULLRESS由来のテスト記事")
  const r1 = await addDrafts([fullress])

  // Step2: 同じstyleCodeでUPTODATE由来を追加 → FULLRESS側が消えてUPTODATE側だけ残るはず
  const uptodate = makeDraft("UPTODATE", "【デバッグ】UPTODATE由来のテスト記事")
  const r2 = await addDrafts([uptodate])

  const { drafts } = await readDrafts()
  const remaining = drafts
    .filter((d) => d.suggestedColorways?.some((c) => c.styleCode === TEST_STYLE_CODE))
    .map((d) => ({ id: d.id, title: d.title, source: d.sourceRefs[0]?.name }))

  return NextResponse.json({
    step1_fullress_added: r1,
    step2_uptodate_added: r2,
    remainingWithTestStyleCode: remaining,
    expectation: "remainingには UPTODATE由来 1件だけが残るはず(FULLRESSは追い出される)",
  })
}
