/**
 * 一次情報探索の「自動でURLを引いてくる」経路。**現在は恒久的に無効。**
 *
 * かつては Google Programmable Search Engine の Custom Search JSON API を
 * 呼ぶ実装だったが、この API は新規利用者への提供が終了している。
 * 既存の利用実績があるアカウントのみが 2027-01-01 のサービス終了まで使え、
 * 新規に有効化したプロジェクトからは、課金設定も API 有効化も正常なのに
 * 403 `This project does not have the access to Custom Search JSON API.`
 * が返る（2026-08-20、Googleサポートの公式回答で確定）。
 *
 * **設定では直らない。** 課金アカウントの昇格も新規APIキーの発行も効果が無い。
 * 同じ道を辿らないよう、鍵を足せば動くかのような記述は残していない。
 *
 * このプロジェクトではこの経路を一度も有効化していないため（本番Vercelに
 * GOOGLE_CSE_* は存在しない）、無効化しても挙動は変わらない。呼び出し側
 * (find-primary API) は元々「検索URLを提示するだけ」の半自動フローへ
 * フォールバックする設計で、それが今後の既定の動作になる。
 *
 * 代替を入れるなら有料の検索APIになる。**入れる前に、半自動フローで
 * 実際に困っている場面があるかを確認すること**（今は困っていない）。
 */
export type WebSearchResult = { label: string; url: string }

/** 常に false。自動検索の経路は無い（上のコメント参照） */
export function isWebSearchConfigured(): boolean {
  return false
}

/** 常に空配列。呼び出し側は検索URLを提示する半自動フローへフォールバックする */
export async function searchWeb(_query: string, _limit = 5): Promise<WebSearchResult[]> {
  void _limit
  return []
}
