import type { MissingFacet } from "@/lib/source-watch/present"

// 「不足」項目→表示ラベル/次アクションボタン文言/Inspectorのどこにフォーカスするか、の対応表。
// SmartQueue・MissingInformation・ProductCard・SourceInspectorの全てがこの1つの表を参照する。
export type FocusTarget = MissingFacet

export const MISSING_FACET_LABEL: Record<MissingFacet, string> = {
  official: "公式情報",
  domestic: "国内販売先",
  image: "使用可能画像",
  purchase: "購入リンク",
}

export const MISSING_FACET_ACTION_LABEL: Record<MissingFacet, string> = {
  official: "公式情報を探す",
  domestic: "国内販売を探す",
  image: "画像を探す",
  purchase: "購入リンクを探す",
}
