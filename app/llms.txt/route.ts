import { getAllArticles, getAllBrands } from "@/lib/storage"
import { siteConfig, categoryLabel } from "@/lib/site-config"

/**
 * AI検索向けのサイト要約（/llms.txt）。
 *
 * llms.txt は公式標準ではなく、参照するかどうかは各AI事業者次第。効果は保証されない。
 * 作成コストが小さく害も無いので、他サービス（歌って♪みたNAVI！/ PDC Cleaner）に
 * 揃える位置づけで置いている。**これを置いたから引用される、とは考えないこと。**
 * 引用の可否を実際に左右するのは、素のHTML・h1・構造化データ・一次情報リンクの方。
 *
 * 静的ファイルにしないのは、毎日記事が増えるサイトで内容が陳腐化するため。
 * ads.txt と同じくルートで生成する。
 */
// The content is sourced from Vercel Blob. Keep credential-free builds
// reproducible and resolve the latest article list at request time.
export const dynamic = "force-dynamic"

const MAX_RECENT = 20

export async function GET() {
  const articles = await getAllArticles()
  const brands = await getAllBrands()
  const recent = articles.slice(0, MAX_RECENT)
  const url = (path: string) => new URL(path, siteConfig.url).toString()

  const categories = siteConfig.categories
    .map((c) => `- [${c.label}](${url(`/category/${c.slug}`)}): ${c.label}カテゴリの記事一覧`)
    .join("\n")

  const recentList = recent
    .map((a) => {
      const date = (a.publishedAt ?? "").slice(0, 10)
      return `- [${a.title}](${url(`/articles/${a.slug}`)}): ${categoryLabel(a.category)}${date ? ` / ${date}` : ""}`
    })
    .join("\n")

  const body = `# ${siteConfig.name}

> ${siteConfig.description}

${siteConfig.name}は、スニーカー・ストリートファッションの発売日、再販、コラボ情報を
扱うニュースメディアです。記事はブランドやメーカーの公式発表を一次情報として確認した上で
公開しており、掲載している画像は権利者が公開しているものに限っています。

## Primary pages

- [トップ](${url("/")}): 最新記事の一覧
${categories}

## Recent articles

${recentList}

## Coverage

- 掲載ブランド数: ${brands.length}
- 公開記事数: ${articles.length}

## Important notes

- 発売日・価格・抽選の応募期間は変更されることがあります。実際に購入・応募する前に、
  記事内からリンクしている公式ページで最新の情報を確認してください。
- 記事には広告（アフィリエイトリンク）を含む場合があり、該当箇所にはPR表記があります。
- 在庫や当選を保証するものではありません。
`

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
