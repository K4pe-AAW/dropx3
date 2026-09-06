import { readJson, writeJson, generateId } from "@/lib/storage"
import type { AffiliateLink, GalleryImage } from "@/lib/types"

const VINTAGE_DRAFTS_PATH = "data/vintage-drafts.json"

/**
 * 古着屋(tonari/ROOM)投稿の「下書き」。generic な収集パイプラインのDraft型(lib/types.ts)とは
 * あえて別にしてある。下書きからの公開も、Instagram投稿URL単位の重複防止と店舗情報の付与を
 * 共通化するためpublishShopUpdate経由にする。画像は保存時点でBlobにアップロード済みのURLで持つ
 * (公開前提の下書きなので、都度Fileを持ち回らない)。
 */
export type VintageDraft = {
  id: string
  shop: string
  postUrl: string
  title: string
  excerpt: string
  bodyParagraphs: string[]
  affiliateLinks: AffiliateLink[]
  tags: string[]
  coverImage: string
  coverImageAlt: string
  galleryImages: GalleryImage[]
  createdAt: string
}

type VintageDraftsData = { drafts: VintageDraft[] }

export async function readVintageDrafts(): Promise<VintageDraftsData> {
  return readJson<VintageDraftsData>(VINTAGE_DRAFTS_PATH, { drafts: [] })
}

export async function addVintageDraft(input: Omit<VintageDraft, "id" | "createdAt">): Promise<VintageDraft> {
  const data = await readVintageDrafts()
  const draft: VintageDraft = {
    ...input,
    id: generateId(`vintage-draft-${input.shop}-${Date.now()}-${Math.random()}`),
    createdAt: new Date().toISOString(),
  }
  data.drafts.unshift(draft)
  await writeJson(VINTAGE_DRAFTS_PATH, data)
  return draft
}

export async function getVintageDraftById(id: string): Promise<VintageDraft | undefined> {
  const { drafts } = await readVintageDrafts()
  return drafts.find((d) => d.id === id)
}

export async function removeVintageDraft(id: string): Promise<void> {
  const data = await readVintageDrafts()
  data.drafts = data.drafts.filter((d) => d.id !== id)
  await writeJson(VINTAGE_DRAFTS_PATH, data)
}
