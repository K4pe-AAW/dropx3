import type { Draft } from "./types"

/** 髭ミルク公式YouTube。チャンネル名が変更されてもIDで収集方針を維持する。 */
export const HIGE_MILK_CHANNEL_ID = "UC2eG6etImm_nJwbXiEzpObw"

const HIGE_MILK_NAME = "髭ミルク"
const NON_PRODUCT_PATTERN = /モーニング\s*グッド|嫁ヘルツ|ラジオ|ポッドキャスト|podcast|雑談|(?:^|[\s【[(])live(?:[\s】)\]]|$)/i
const PRODUCT_TOPIC_PATTERN = /スニーカー|シューズ|靴|ブーツ|革靴|サンダル|デニム|ジーンズ|ウェア|アパレル|洋服|ジャケット|コート|シャツ|パンツ|バッグ|財布|時計|アクセサリー|キャップ|ハット/i
const PRODUCT_ACTION_PATTERN = /開封|レビュー|購入|買えた|当選|発売|新作|復刻|コラボ|比較|紹介|着用|並び|抽選/i

function isHigeMilkSource(sourceName: string, channelId?: string): boolean {
  return channelId === HIGE_MILK_CHANNEL_ID || sourceName.replace(/[\s　_-]/g, "").includes(HIGE_MILK_NAME)
}

/**
 * 髭ミルクは商品紹介動画だけを収集する。
 * モーニンググッド等のポッドキャスト、ラジオ、雑談LIVEは記事化しない。
 * 他のYouTubeチャンネルにはこの専用方針を適用しない。
 */
export function isYoutubeVideoCollectable(
  sourceName: string,
  title: string,
  description = "",
  channelId?: string
): boolean {
  if (!isHigeMilkSource(sourceName, channelId)) return true
  const text = `${title} ${description}`
  if (NON_PRODUCT_PATTERN.test(text)) return false
  return PRODUCT_TOPIC_PATTERN.test(text) || PRODUCT_ACTION_PATTERN.test(text)
}

/** 収集済みの旧下書きも、髭ミルクの商品動画以外は自動公開しない。 */
export function isDraftAllowedByYoutubeCollectionPolicy(draft: Draft): boolean {
  if (!draft.suggestedYoutubeVideoId) return true
  const sourceRefs = draft.sourceRefs ?? []
  const sourceName = sourceRefs.find((ref) => /(?:youtube\.com|youtu\.be)/i.test(ref.url))?.name
    ?? sourceRefs[0]?.name
    ?? ""
  const text = [draft.excerpt ?? "", ...(draft.bodyParagraphs ?? [])].join(" ")
  return isYoutubeVideoCollectable(sourceName, draft.title, text)
}
