import type { Metadata } from "next"
import Link from "next/link"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "編集・訂正ポリシー",
  description: `${siteConfig.name}の記事制作、情報確認、AI利用、画像、広告、訂正に関する編集方針です。`,
  alternates: { canonical: new URL("/editorial-policy", siteConfig.url).toString() },
}

export default function EditorialPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-14">
      <p className="text-xs font-black tracking-[0.2em] text-accent">EDITORIAL POLICY</p>
      <h1 className="mt-2 text-3xl font-black">編集・訂正ポリシー</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        {siteConfig.name}は、読者が発売日・価格・販売先を確認し、公式情報へたどり着けることを重視するファッションニュースメディアです。
      </p>

      <div className="mt-10 space-y-9 text-sm leading-7">
        <section>
          <h2 className="text-lg font-black">情報源と確認方法</h2>
          <p className="mt-2">ブランド、メーカー、正規販売店の公式発表を優先し、記事末尾に情報元・参考リンクを表示します。価格、発売日、型番、素材、販売方法は、確認できた内容だけを掲載します。</p>
        </section>
        <section>
          <h2 className="text-lg font-black">未確認情報</h2>
          <p className="mt-2">公式確認前の情報にはGoss!pまたはリークの表示を付け、確定情報と区別します。公式ページまたは正規販売店の商品ページで確認できた場合は、記事の確度と内容を更新します。</p>
        </section>
        <section>
          <h2 className="text-lg font-black">AI・自動化の利用</h2>
          <p className="mt-2">情報収集、要約、下書き作成、重複確認などにAIと自動化を利用する場合があります。公開時には出典、画像、商品情報を確認し、元情報にない価格・発売日・素材・機能を推測で追加しません。</p>
        </section>
        <section>
          <h2 className="text-lg font-black">画像</h2>
          <p className="mt-2">公式発表、公式商品ページ、利用条件を確認した素材、編集部が制作・撮影した画像を使用します。画像の出典やクレジットが必要な場合は記事内に明記します。</p>
        </section>
        <section>
          <h2 className="text-lg font-black">広告と編集の独立性</h2>
          <p className="mt-2">記事にはアフィリエイトリンクや広告が含まれる場合があります。該当箇所にはPR表記を行い、広告の有無によって事実関係や評価を変更しません。公式情報への非広告リンクを購入リンクより先に案内します。</p>
        </section>
        <section>
          <h2 className="text-lg font-black">更新と訂正</h2>
          <p className="mt-2">発売日、価格、販売先、情報の確度に変更があった場合は記事を更新します。重要な誤りを確認した場合は速やかに訂正し、記事には更新日を表示します。</p>
        </section>
        <section>
          <h2 className="text-lg font-black">運営・問い合わせ</h2>
          <p className="mt-2">運営者情報と連絡先は<Link href="/about" className="font-bold underline underline-offset-2">サイトについて</Link>をご確認ください。</p>
        </section>
      </div>
    </main>
  )
}
