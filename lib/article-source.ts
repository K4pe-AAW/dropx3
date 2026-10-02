type SourceBackedContent = {
  sourceRefs?: { name?: string; url?: string }[]
}

export const MAX_PR_TIMES_ARTICLES_PER_DAY = 3
export const MAX_FASHIONSNAP_ARTICLES_PER_DAY = 3

function hasSource(
  content: SourceBackedContent,
  namePattern: RegExp,
  domains: string[]
): boolean {
  return (content.sourceRefs ?? []).some((ref) => {
    if (namePattern.test(ref.name ?? "")) return true
    try {
      const hostname = new URL(ref.url ?? "").hostname.toLowerCase()
      return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
    } catch {
      return false
    }
  })
}

/**
 * FASHIONSNAP由来の記事だけを媒体配分の対象にする。
 * 表示名に加え、過去データで表示名が変わっていても公式ドメインなら判定できるようにする。
 */
export function isFashionsnapSourced(content: SourceBackedContent): boolean {
  return hasSource(content, /fashion\s*snap/i, ["fashionsnap.com"])
}

/** PR TIMES由来の記事を表示名と公式ドメインの両方で判定する。 */
export function isPrTimesSourced(content: SourceBackedContent): boolean {
  return hasSource(content, /pr\s*times/i, ["prtimes.jp"])
}
