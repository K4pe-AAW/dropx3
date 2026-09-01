const TARGET = "噂"
const REPLACEMENT = "Gossp!"

export type GosspConversion<T> = {
  value: T
  replacements: number
}

/** 公開データ内のユーザー向け文言を再帰的に変換する。ID・URL等も含め、対象文字が無ければ不変。 */
export function convertRumorToGossp<T>(input: T): GosspConversion<T> {
  let replacements = 0

  function visit(value: unknown): unknown {
    if (typeof value === "string") {
      const matches = value.match(/噂/g)
      if (!matches) return value
      replacements += matches.length
      return value.replaceAll(TARGET, REPLACEMENT)
    }
    if (Array.isArray(value)) return value.map(visit)
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)]))
    }
    return value
  }

  return { value: visit(input) as T, replacements }
}
