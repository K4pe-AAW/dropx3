import assert from "node:assert/strict"
import test from "node:test"
import type { Article, SnapProfile } from "./types"
import { findDuplicateSnap, matchesSnapFilter, sanitizeSnapProfile, validateSnapProfile } from "./snap"

const profile: SnapProfile = {
  displayName: "Koh",
  location: "渋谷",
  stylePoint: "古着と新品を混ぜる",
  consentConfirmed: true,
  items: [{ category: "トップス", brand: "Stussy", itemName: "Vintage Tee" }],
}
const article = { id: "1", contentType: "SNAP", brands: ["Stussy"], coverImage: "/images/snap-1.jpg", snapProfile: profile } as Article

test("SNAP入力をサニタイズし危険なSNS URLを落とす", () => {
  const value = sanitizeSnapProfile({ ...profile, displayName: " Koh ", instagramUrl: "javascript:alert(1)" })
  assert.equal(value?.displayName, "Koh")
  assert.equal(value?.instagramUrl, undefined)
  assert.equal(validateSnapProfile(value), undefined)
})

test("公開には名前・ポイント・掲載同意が必要", () => {
  assert.equal(validateSnapProfile({ ...profile, consentConfirmed: false }), "撮影・掲載同意の確認が必要です")
  assert.equal(validateSnapProfile({ ...profile, displayName: "" }), "SNAPの名前・ニックネームは必須です")
})

test("ブランドとアイテムでSNAPを絞り込める", () => {
  assert.equal(matchesSnapFilter(article, "stus", "tee"), true)
  assert.equal(matchesSnapFilter(article, "nike", ""), false)
})

test("同じ画像または同じ人物・場所を重複と判定する", () => {
  assert.equal(findDuplicateSnap([article], "/images/snap-1.jpg", { ...profile, displayName: "Other" })?.id, "1")
  assert.equal(findDuplicateSnap([article], "/images/other.jpg", { ...profile, displayName: "koh" })?.id, "1")
})
