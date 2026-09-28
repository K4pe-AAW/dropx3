import type { Metadata } from "next"
import Link from "next/link"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "ブランド・企業の皆さまへ",
  description: "DROP DROP DROPへのプレスリリース、商品情報、取材、レビュー、広告掲載のご相談窓口です。",
  alternates: { canonical: new URL("/for-brands", siteConfig.url).toString() },
}

const requests = [
  ["プレスリリース・新作情報", "発売日、価格、型番、販売先、使用可能な画像素材をお送りください。"],
  ["商品レビュー・取材", "編集部が実物を確認し、編集方針に基づいて掲載可否と内容を判断します。"],
  ["広告・タイアップ", "PR表記と広告リンク属性を明示し、編集記事と区別して掲載します。"],
]

export default function ForBrandsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <p className="text-xs font-black tracking-[0.2em] text-muted-foreground">FOR BRANDS</p>
      <h1 className="mt-2 text-3xl font-black">ブランド・企業の皆さまへ</h1>
      <p className="mt-5 text-sm leading-8 text-foreground/80">
        {siteConfig.name}では、ファッション、スニーカー、ライフスタイル領域の一次情報を受け付けています。掲載は保証せず、読者に有用な情報か、画像・事実関係を確認できるかを編集部が判断します。
      </p>
      <div className="mt-10 grid gap-4">
        {requests.map(([title, description]) => (
          <section key={title} className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-black">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
          </section>
        ))}
      </div>
      <section className="mt-10 rounded-2xl bg-primary p-7 text-primary-foreground">
        <h2 className="text-lg font-black">送付時に必要な情報</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-primary-foreground/80">
          <li>ブランド・会社名とご担当者名</li>
          <li>公式発表文または公式URL</li>
          <li>商品名、価格、発売日、販売先、型番</li>
          <li>掲載許可済み画像とクレジット表記</li>
          <li>広告・商品提供の有無</li>
        </ul>
        {siteConfig.contactEmail && (
          <a href={`mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent("DROP DROP DROP 掲載・取材の相談")}`} className="mt-6 inline-flex rounded-full bg-background px-5 py-3 text-sm font-black text-foreground">
            {siteConfig.contactEmail} へ相談する
          </a>
        )}
      </section>
      <p className="mt-8 text-xs leading-6 text-muted-foreground">
        商品提供や広告費の有無は掲載判断と編集内容を保証するものではありません。詳しくは<Link href="/editorial-policy" className="font-bold underline">編集・訂正ポリシー</Link>をご確認ください。
      </p>
    </main>
  )
}
