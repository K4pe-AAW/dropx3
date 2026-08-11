import type { ImageAsset, SourceLink } from "@/lib/source-watch/types"

/** ImageAssetの出典表示名を解決する。同じSourceItemから確認済みのSourceLinkがあればその発行元名を使う */
export function resolvePublisher(asset: ImageAsset, sourceLinks: SourceLink[]): string {
  const link = sourceLinks.find((l) => asset.sourceItemId && l.sourceItemId === asset.sourceItemId)
  if (link) return link.publisher
  try {
    return new URL(asset.sourceUrl).hostname.replace(/^www\./, "")
  } catch {
    return "不明"
  }
}
