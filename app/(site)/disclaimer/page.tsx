import type { Metadata } from "next"
import type { ReactNode } from "react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = { title: "アフィリエイト表記・免責事項" }

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold mb-2">{title}</h2>
      <p>{children}</p>
    </section>
  )
}

export default function DisclaimerPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-black mb-8">アフィリエイト表記・免責事項</h1>
      <div className="space-y-8 text-sm leading-[1.9] text-foreground/90">
        <Section title="広告について（PR表記）">
          当サイトの記事には、Amazonアソシエイト・楽天アフィリエイト・A8.net・バリューコマース等のアフィリエイトプログラムによる広告リンクが含まれます。「PR」バッジが表示されている記事・リンクは、ユーザーが当該リンク経由で商品の購入・サービスの申込を行った場合に、当サイトが提携先事業者から紹介料を受け取ることがあります。紹介料の有無は記事の内容・評価には一切影響しません。
        </Section>

        <Section title="商標・画像の著作権について">
          記事内で使用しているブランド名・商品名・ロゴ等は各権利者の商標または登録商標です。商品画像は各ブランド・販売店・提携ASPが提供する画像を使用しており、著作権は各権利者に帰属します。
        </Section>

        <Section title="価格・在庫・発売日について">
          記事内の価格・発売日・在庫状況は記事公開時点の情報です。その後、予告なく変更・終了となる場合があります。購入・申込の前に、必ず各販売店・ブランドの公式サイトで最新情報をご確認ください。
        </Section>

        <Section title="情報の正確性について">
          当サイトは正確な情報の掲載に努めていますが、内容の正確性・完全性・最新性を保証するものではありません。当サイトの情報を利用したことにより生じたいかなる損害についても、{siteConfig.name}は責任を負いかねます。
        </Section>

        <Section title="お問い合わせ">
          本表記に関するお問い合わせは
          {siteConfig.contactEmail ? ` ${siteConfig.contactEmail} まで` : "サイト運営者まで"}お願いいたします。
        </Section>
      </div>
    </div>
  )
}
