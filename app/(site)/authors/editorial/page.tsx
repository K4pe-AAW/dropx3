import type { Metadata } from "next"
import Link from "next/link"
import { siteConfig } from "@/lib/site-config"
import { serializeJsonLd } from "@/lib/json-ld"

export const metadata: Metadata = {
  title: `${siteConfig.name}編集部`,
  description: `${siteConfig.name}編集部のプロフィール、担当領域、編集方針。`,
  alternates: { canonical: new URL("/authors/editorial", siteConfig.url).toString() },
}

export default function EditorialAuthorPage() {
  const url = new URL("/authors/editorial", siteConfig.url).toString()
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Organization",
      name: `${siteConfig.name}編集部`,
      url,
      description: "スニーカー、ストリートファッション、ブランド新作、発売・再販情報を扱う編集チーム。",
      parentOrganization: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    },
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <p className="text-xs font-black tracking-[0.2em] text-accent">AUTHOR</p>
      <h1 className="mt-2 text-3xl font-black">{siteConfig.name}編集部</h1>
      <div className="mt-6 space-y-5 text-sm leading-7">
        <p>スニーカー、ストリートファッション、ブランド新作、発売・再販、正規販売店情報を中心に取材・編集しています。</p>
        <p>公式発表と一次情報を優先し、価格・発売日・型番・販売先を確認できる形で整理します。未確認情報は確定情報と区別し、公式確認後に更新します。</p>
        <p><Link href="/editorial-policy" className="font-bold underline underline-offset-2">編集・訂正ポリシーを見る</Link></p>
      </div>
    </main>
  )
}
