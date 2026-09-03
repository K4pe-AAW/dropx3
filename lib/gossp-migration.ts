const RUMOR_TARGET = "噂"
const LEGACY_LABEL = "Gossp!"
const REPLACEMENT = "Goss!p"

export type GosspConversion<T> = {
  value: T
  replacements: number
}

/** 公開データ内のユーザー向け文言を再帰的に変換する。ID・URL等も含め、対象文字が無ければ不変。 */
function convertStrings<T>(input: T, pattern: RegExp, replace: (value: string) => string): GosspConversion<T> {
  let replacements = 0

  function visit(value: unknown): unknown {
    if (typeof value === "string") {
      const matches = value.match(pattern)
      if (!matches) return value
      replacements += matches.length
      return replace(value)
    }
    if (Array.isArray(value)) return value.map(visit)
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)]))
    }
    return value
  }

  return { value: visit(input) as T, replacements }
}

/** 旧来の日本語ラベルを現在のブランド表記へ変換する。 */
export function convertRumorToGossp<T>(input: T): GosspConversion<T> {
  return convertStrings(input, /噂/g, (value) => value.replaceAll(RUMOR_TARGET, REPLACEMENT))
}

/** 既存データ内の旧表記だけを、意図したブランド表記へ安全に正規化する。 */
export function normalizeGosspLabel<T>(input: T): GosspConversion<T> {
  return convertStrings(input, /Gossp!/g, (value) => value.replaceAll(LEGACY_LABEL, REPLACEMENT))
}
