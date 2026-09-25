type SourceBackedContent = {
  sourceRefs?: { name?: string; url?: string }[]
}

/**
 * FASHIONSNAP由来の記事だけを媒体配分の対象にする。
 * 表示名に加え、過去データで表示名が変わっていても公式ドメインなら判定できるようにする。
 */
export function isFashionsnapSourced(content: SourceBackedContent): boolean {
  return (content.sourceRefs ?? []).some((ref) => {
    if (/fashion\s*snap/i.test(ref.name ?? "")) return true
    try {
      const hostname = new URL(ref.url ?? "").hostname.toLowerCase()
      return hostname === "fashionsnap.com" || hostname.endsWith(".fashionsnap.com")
    } catch {
      return false
    }
  })
}
