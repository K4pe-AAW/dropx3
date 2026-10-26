import type { Draft, RawItem } from "./types"

const UPTODATE = "UPTODATE"
const FULLRESS = "FULLRESS"

export function normalizedMediaSourceName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "").toUpperCase()
}

function sourceNamesOf(value: Pick<RawItem, "sourceName"> | Pick<Draft, "sourceRefs">): Set<string> {
  return new Set(
    "sourceName" in value
      ? [normalizedMediaSourceName(value.sourceName)]
      : value.sourceRefs.map((ref) => normalizedMediaSourceName(ref.name))
  )
}

function styleCodesIn(text: string): Set<string> {
  const normalized = text.normalize("NFKC").toUpperCase()
  const candidates = normalized.match(/[A-Z0-9][A-Z0-9./-]{4,}[A-Z0-9]/g) ?? []
  return new Set(
    candidates
      .map((value) => value.replace(/[./]/g, "-"))
      .filter((value) => /[A-Z]/.test(value) && /\d/.test(value))
      .filter((value) => !/^20\d{2}[A-Z-]*$/.test(value))
  )
}

function latinProductTokens(text: string): Set<string> {
  const withoutParenthetical = text.normalize("NFKC").replace(/[（(][^）)]*[）)]/g, " ").toLowerCase()
  const stopWords = new Set([
    "a", "an", "and", "by", "collection", "collaboration", "domestic", "for", "from", "in", "jp",
    "new", "of", "official", "on", "release", "released", "releasing", "the", "to", "with",
  ])
  return new Set(
    (withoutParenthetical.match(/[a-z0-9]+/g) ?? [])
      .filter((token) => token.length >= 2)
      .filter((token) => !/^20\d{2}$/.test(token))
      .filter((token) => !stopWords.has(token))
  )
}

function jaccard(left: Set<string>, right: Set<string>): number {
  const union = new Set([...left, ...right])
  if (union.size === 0) return 0
  let intersection = 0
  for (const value of left) if (right.has(value)) intersection++
  return intersection / union.size
}

type MediaStory = {
  sourceNames: Set<string>
  title: string
  text: string
  styleCodes: Set<string>
}

function rawStory(item: RawItem): MediaStory {
  const text = `${item.title} ${item.snippet ?? ""}`
  return {
    sourceNames: sourceNamesOf(item),
    title: item.title,
    text,
    styleCodes: styleCodesIn(text),
  }
}

function draftStory(draft: Draft): MediaStory {
  const structuredCodes = (draft.suggestedColorways ?? [])
    .map((colorway) => colorway.styleCode?.normalize("NFKC").toUpperCase().replace(/[./]/g, "-"))
    .filter((value): value is string => Boolean(value))
  const text = `${draft.title} ${draft.excerpt} ${draft.bodyParagraphs.join(" ")}`
  return {
    sourceNames: sourceNamesOf(draft),
    title: draft.title,
    text,
    styleCodes: new Set([...structuredCodes, ...styleCodesIn(text)]),
  }
}

function isPreferredPair(left: MediaStory, right: MediaStory): boolean {
  return (
    (left.sourceNames.has(UPTODATE) && right.sourceNames.has(FULLRESS)) ||
    (left.sourceNames.has(FULLRESS) && right.sourceNames.has(UPTODATE))
  )
}

function sameStory(left: MediaStory, right: MediaStory): boolean {
  if (!isPreferredPair(left, right)) return false

  if ([...left.styleCodes].some((code) => right.styleCodes.has(code))) return true

  const leftTokens = latinProductTokens(left.title)
  const rightTokens = latinProductTokens(right.title)
  if (leftTokens.size < 3 || rightTokens.size < 3) return false
  return jaccard(leftTokens, rightTokens) >= 0.75
}

/**
 * 同一ニュースをUPTODATEとFULLRESSが配信した場合だけ、UPTODATEを残す。
 * 型番一致を最優先し、型番が無い場合は商品名に含まれる英数字トークンが十分一致する時だけ
 * 重複とみなす。他媒体同士や色違いを不用意に統合しないため、対象ソースを限定している。
 */
export function preferUpToDateRawItems(items: RawItem[]): RawItem[] {
  const upToDateStories = items
    .filter((item) => sourceNamesOf(item).has(UPTODATE))
    .map(rawStory)

  return items.filter((item) => {
    if (!sourceNamesOf(item).has(FULLRESS)) return true
    const story = rawStory(item)
    return !upToDateStories.some((preferred) => sameStory(story, preferred))
  })
}

export function areUpToDateFullressDuplicates(left: Draft, right: Draft): boolean {
  return sameStory(draftStory(left), draftStory(right))
}

export function prefersUpToDate(draft: Draft): boolean {
  return sourceNamesOf(draft).has(UPTODATE)
}
