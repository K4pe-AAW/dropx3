import type { Metadata } from "next"
import type { ReactNode } from "react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = { title: "プライバシーポリシー" }

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold mb-2">{title}</h2>
      <p>{children}</p>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-black mb-8">プライバシーポリシー</h1>
      <div className="space-y-8 text-sm leading-[1.9] text-foreground/90">
        <p>
          {siteConfig.name}（以下「当サイト」）は、ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
        </p>

        <Section title="1. アクセス解析ツールについて">
          当サイトでは、Googleアナリティクス等のアクセス解析ツールを利用する場合があります。これらのツールはトラフィックデータの収集のためにCookieを使用しますが、このトラフィックデータは匿名で収集されており、個人を特定するものではありません。
        </Section>

        <Section title="2. 広告配信・アフィリエイトプログラムについて">
          当サイトは、Amazonアソシエイト・楽天アフィリエイト・A8.net・バリューコマース等のアフィリエイトプログラムに参加しています。これらのプログラムを通じて商品・サービスを紹介する際、各アフィリエイト提供事業者がCookieを使用してユーザーの当サイトへのアクセス情報を取得することがあります。詳しくは各アフィリエイト提供事業者のプライバシーポリシーをご確認ください。
        </Section>

        <Section title="3. 個人情報の第三者提供について">
          当サイトは、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
        </Section>

        <Section title="4. 免責事項">
          当サイトからリンクやバナーで移動した先のウェブサイトで提供される情報・サービス等について、一切の責任を負いません。また当サイトのコンテンツ・情報について、可能な限り正確な情報を掲載するよう努めていますが、正確性や安全性を保証するものではありません。
        </Section>

        <Section title="5. プライバシーポリシーの変更について">
          当サイトは、法令等を遵守しつつ、本ポリシーの内容を適宜見直し、予告なく変更することがあります。
        </Section>

        <Section title="お問い合わせ">
          本ポリシーに関するお問い合わせは {siteConfig.contactEmail} までお願いいたします。
        </Section>
      </div>
    </div>
  )
}
