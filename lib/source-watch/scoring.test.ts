import { test } from "node:test"
import assert from "node:assert/strict"
import {
  classifyTier,
  computeCorroboratedScore,
  computeReadiness,
  determineDomesticConfirmed,
  determineOfficialConfirmed,
} from "./scoring"

// --- Source Scoreの計算 ---

test("computeCorroboratedScore: 単一ソースはそのスコアのまま", () => {
  assert.equal(computeCorroboratedScore([65]), 65)
})

test("computeCorroboratedScore: 複数ソースの裏取りでスコアが上がる(最高値+5×追加ソース数、上限+15)", () => {
  assert.equal(computeCorroboratedScore([65, 65]), 70)
  assert.equal(computeCorroboratedScore([65, 65, 65]), 75)
  assert.equal(computeCorroboratedScore([65, 65, 65, 65, 65]), 80) // 4件以上でも+15で頭打ち
})

test("computeCorroboratedScore: 100点を超えない", () => {
  assert.equal(computeCorroboratedScore([100, 95, 90, 90]), 100)
})

// --- Tier(CONFIRMED/REPORTED/RUMOR)分類 ---

test("classifyTier: 公式/正規販売店の確認があればCONFIRMED", () => {
  assert.equal(classifyTier({ hasOfficialOrAuthorizedRetailerLink: true, reliableSourceCount: 0 }), "CONFIRMED")
})

test("classifyTier: 公式未確認でも信頼できる複数ソースがあればREPORTED", () => {
  assert.equal(classifyTier({ hasOfficialOrAuthorizedRetailerLink: false, reliableSourceCount: 2 }), "REPORTED")
})

test("classifyTier: 単一ソースのみはRUMOR(複数ソースの裏取りが無い早期情報)", () => {
  assert.equal(classifyTier({ hasOfficialOrAuthorizedRetailerLink: false, reliableSourceCount: 1 }), "RUMOR")
  assert.equal(classifyTier({ hasOfficialOrAuthorizedRetailerLink: false, reliableSourceCount: 0 }), "RUMOR")
})

// --- 確認フラグ(海外発売と国内発売の混同を防ぐ) ---

test("determineDomesticConfirmed: 海外発売日だけでは国内発売確認にならない", () => {
  // overseasReleaseDateがあってもdomesticReleaseDateがnullなら false — 呼び出し側はdomesticReleaseDateしか渡さない設計
  assert.equal(determineDomesticConfirmed(null, false), false)
})

test("determineDomesticConfirmed: 明示的な国内発売日があればtrue", () => {
  assert.equal(determineDomesticConfirmed("2026年9月1日", false), true)
})

test("determineDomesticConfirmed: 国内正規販売店からの掲載でもtrue", () => {
  assert.equal(determineDomesticConfirmed(null, true), true)
})

test("determineOfficialConfirmed: 公式リンクタイプならtrue、rumorタイプ単独ならfalse", () => {
  assert.equal(determineOfficialConfirmed("official_product", false), true)
  assert.equal(determineOfficialConfirmed("press_release", false), true)
  assert.equal(determineOfficialConfirmed("rumor", false), false)
  assert.equal(determineOfficialConfirmed("media", false), false)
})

test("determineOfficialConfirmed: 国内正規販売店ならリンクタイプに関わらずtrue", () => {
  assert.equal(determineOfficialConfirmed("retailer", true), true)
})

// --- READY/REVIEW/HOLD 判定 ---

const fullMarksInput = {
  tier: "CONFIRMED" as const,
  officialConfirmed: true,
  hasProductName: true,
  hasBrand: true,
  hasStyleCode: true,
  hasReleaseDate: true,
  hasPrice: true,
  domesticConfirmed: true,
  hasSafeImage: true,
  hasUnresolvedImageRights: false,
  hasAccuratePurchaseLink: true,
  hasRelatedArticle: true,
  sourceLinkCount: 2,
  isDuplicate: false,
  domesticClaimedWithoutConfirmation: false,
  priceGuessedWithoutSource: false,
}

test("computeReadiness: 全項目満たせば100点でREADY", () => {
  const result = computeReadiness(fullMarksInput)
  assert.equal(result.score, 100)
  assert.equal(result.readiness, "READY")
  assert.deepEqual(result.blockReasons, [])
})

test("computeReadiness: 80点以上でREADY、60〜79でREVIEW、59以下でHOLD", () => {
  // officialSource(20)を落とす -> 80点
  const ready = computeReadiness({ ...fullMarksInput, officialConfirmed: false })
  assert.equal(ready.score, 80)
  assert.equal(ready.readiness, "READY")

  // さらにpurchaseLink(10)も落とす -> 70点
  const review = computeReadiness({ ...fullMarksInput, officialConfirmed: false, hasAccuratePurchaseLink: false })
  assert.equal(review.score, 70)
  assert.equal(review.readiness, "REVIEW")

  // さらにsafeImage(15)も落とす -> 55点
  const hold = computeReadiness({
    ...fullMarksInput,
    officialConfirmed: false,
    hasAccuratePurchaseLink: false,
    hasSafeImage: false,
  })
  assert.equal(hold.score, 55)
  assert.equal(hold.readiness, "HOLD")
})

test("computeReadiness: RUMORでも確実NG条件が無ければ材料の完成度で判定する", () => {
  const result = computeReadiness({ ...fullMarksInput, tier: "RUMOR" })
  assert.equal(result.score, 100)
  assert.equal(result.readiness, "READY")
  assert.equal(result.blockReasons.length, 0)
})

test("computeReadiness: 画像Rights不明は点数に関係なく自動公開禁止", () => {
  const result = computeReadiness({ ...fullMarksInput, hasSafeImage: false, hasUnresolvedImageRights: true })
  assert.equal(result.readiness, "HOLD")
  assert.ok(result.blockReasons.includes("画像Rights不明"))
})

test("computeReadiness: 情報元なし/商品名なし/重複商品/価格推測/国内発売断定もそれぞれ自動公開禁止", () => {
  assert.ok(computeReadiness({ ...fullMarksInput, sourceLinkCount: 0 }).blockReasons.includes("情報元なし"))
  assert.ok(computeReadiness({ ...fullMarksInput, hasProductName: false }).blockReasons.includes("商品名なし"))
  assert.ok(computeReadiness({ ...fullMarksInput, isDuplicate: true }).blockReasons.includes("重複商品"))
  assert.ok(
    computeReadiness({ ...fullMarksInput, priceGuessedWithoutSource: true }).blockReasons.includes(
      "価格不明なのに推測価格を記載"
    )
  )
  assert.ok(
    computeReadiness({ ...fullMarksInput, domesticClaimedWithoutConfirmation: true }).blockReasons.includes(
      "国内発売未確認なのに国内発売と断定"
    )
  )
})
