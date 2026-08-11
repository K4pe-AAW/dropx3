/**
 * 一次情報探索の完全自動化には汎用Web検索APIキーが必要(現状未設定)。
 * GOOGLE_CSE_API_KEY/GOOGLE_CSE_CXが両方設定されていればGoogle Programmable Search Engineの
 * JSON APIを実際に呼び出して検索結果を返す。未設定の場合は空配列を返し、呼び出し側
 * (find-primary API)は「検索URLを提示するだけ」の既存の半自動フローにフォールバックする。
 *
 * セットアップ手順(有効化したい場合):
 * 1. https://programmablesearchengine.google.com/ で検索エンジンを作成し、検索対象を「ウェブ全体」に設定してCXを取得
 * 2. Google Cloud ConsoleでCustom Search JSON APIを有効化しAPIキーを発行
 * 3. Vercelの環境変数にGOOGLE_CSE_API_KEY/GOOGLE_CSE_CXを追加
 */
export type WebSearchResult = { label: string; url: string }

export function isWebSearchConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX)
}

export async function searchWeb(query: string, limit = 5): Promise<WebSearchResult[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const cx = process.env.GOOGLE_CSE_CX
  if (!apiKey || !cx || !query.trim()) return []

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=${limit}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data.items)) return []
    return data.items
      .filter((item: unknown): item is { title?: string; link?: string } => typeof item === "object" && item !== null)
      .filter((item: { link?: string }) => typeof item.link === "string" && item.link)
      .slice(0, limit)
      .map((item: { title?: string; link?: string }) => ({ label: item.title || item.link!, url: item.link! }))
  } catch {
    return []
  }
}
