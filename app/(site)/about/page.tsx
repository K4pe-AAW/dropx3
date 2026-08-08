import type { Metadata } from "next"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = { title: "サイトについて" }

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-black mb-8">サイトについて</h1>
      <div className="space-y-6 text-sm leading-[1.9] text-foreground/90">
        <p>
          {siteConfig.name}は、スニーカーとストリートファッションの発売・再販・コラボレーション情報を毎日更新するニュースメディアです。新作リリース情報からブランドコラボ、セール情報まで、ストリートカルチャーを追いかける方に向けて記事をお届けしています。
        </p>
        <section>
          <h2 className="text-base font-bold mb-2">運営情報</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-muted-foreground">
            <dt>運営者</dt>
            <dd>{siteConfig.operatorName}</dd>
            <dt>お問い合わせ</dt>
            <dd>{siteConfig.contactEmail}</dd>
          </dl>
        </section>
        <section>
          <h2 className="text-base font-bold mb-2">編集方針</h2>
          <p>
            記事は公式リリースや一次情報をもとに編集部が独自に執筆しています。価格・発売日・在庫状況は記事公開時点の情報であり、その後変更される場合があります。最新情報は各ブランド・販売店の公式サイトでご確認ください。
          </p>
        </section>
      </div>
    </div>
  )
}
