import type { Metadata } from "next"
import { siteConfig } from "@/lib/site-config"
import Link from "next/link"

export const metadata: Metadata = {
  title: "サイトについて",
  description: `${siteConfig.name}の運営情報と編集方針。`,
  alternates: { canonical: new URL("/about", siteConfig.url).toString() },
}

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-12">
      <h1 className="mb-5 text-2xl font-black sm:mb-8">サイトについて</h1>
      <div className="space-y-5 text-sm leading-[1.9] text-foreground/90 sm:space-y-6">
        <p>
          {siteConfig.name}は、20代後半から60代まで、世代を問わずファッションを楽しめるニュースメディアです。スニーカーとストリートファッションを軸に、新作リリース、ブランドコラボ、長く使える定番、着心地のよいアイテムまで毎日紹介します。
        </p>
        <p>
          年齢で着る服を限定せず、トレンド、仕事と休日、素材、シルエット、快適さなど、それぞれの世代が重視する視点から記事を探せます。<Link href="/style-by-age" className="font-bold underline underline-offset-2">年代別の入口はこちら</Link>です。
        </p>
        <section>
          <h2 className="text-base font-bold mb-2">運営情報</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-muted-foreground">
            <dt>運営者</dt>
            <dd>{siteConfig.operatorName}</dd>
            <dt>お問い合わせ</dt>
            <dd>{siteConfig.contactEmail ?? "準備中"}</dd>
          </dl>
        </section>
        <section>
          <h2 className="text-base font-bold mb-2">編集方針</h2>
          <p>
            記事は公式リリースや一次情報をもとに編集部が独自に執筆しています。価格・発売日・在庫状況は記事公開時点の情報であり、その後変更される場合があります。最新情報は各ブランド・販売店の公式サイトでご確認ください。
          </p>
          <p className="mt-2"><Link href="/editorial-policy" className="font-bold underline underline-offset-2">編集・訂正ポリシーの詳細</Link></p>
        </section>
      </div>
    </div>
  )
}
